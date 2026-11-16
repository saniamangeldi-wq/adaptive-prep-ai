import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Subset of the `profiles` row that the app reads. The table itself has many
// more (legacy) columns that we neither read nor write.
interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearPersistedAuth = () => {
    try {
      // supabase-js stores sessions under keys like: sb-<project-ref>-auth-token
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  };

  const hardSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearPersistedAuth();
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // 406 = "No rows" when using .single() with object accept header
      if ((error as any)?.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }
      return null;
    }
    return data as Profile;
  };

  const ensureProfileExists = async (currentUser: User) => {
    const existing = await fetchProfile(currentUser.id);
    if (existing) return existing;

    // Create a minimal profile if it's missing.
    // This prevents login from breaking when profiles were wiped or never created.
    const fullName =
      (currentUser.user_metadata as any)?.full_name ||
      (currentUser.user_metadata as any)?.name ||
      null;
    const avatarUrl = (currentUser.user_metadata as any)?.avatar_url || null;

    // Normally the `on_auth_user_created` database trigger (handle_new_user) has
    // already created this row, so this is only a fallback. The legacy columns
    // below belong to the old app but still exist in the live table (and the
    // server-side credit check may read them), so we keep writing the values
    // this fallback has always written. The database is not being changed.
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: currentUser.id,
        email: currentUser.email ?? "",
        full_name: fullName,
        avatar_url: avatarUrl,
        role: "student",
        tier: "tier_2",
        is_trial: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        credits_remaining: 100,
        tests_remaining: 2,
        questions_used_today: 0,
        onboarding_completed: true,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating missing profile:", insertError);
      return null;
    }

    // Send welcome email (fire-and-forget)
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome-email",
        recipientEmail: currentUser.email,
        idempotencyKey: `welcome-${currentUser.id}`,
        templateData: { name: fullName || undefined },
      },
    }).catch((err) => console.error("Welcome email failed:", err));

    return inserted as Profile;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Ignore transient null sessions from token refresh hiccups.
        // Only clear user state on explicit SIGNED_OUT or USER_DELETED events.
        if (!currentSession && event !== "SIGNED_OUT") {
          return;
        }

        setSession(currentSession);
        const nextUser = currentSession?.user ?? null;
        setUser(nextUser);
        setLoading(false);

        if (nextUser) {
          // Hydrate profile in background
          setTimeout(() => {
            (async () => {
              const profileData = await ensureProfileExists(nextUser);
              setProfile(profileData);
            })();
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Proactively refresh the session when the tab becomes visible again
    // (covers cases where the browser throttles timers on idle tabs).
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => {
        const current = data.session;
        if (!current) return;
        // Only refresh when the token is actually close to expiring. Refreshing
        // on every tab focus churned auth state and disrupted in-progress work.
        const expiresAt = (current.expires_at ?? 0) * 1000;
        if (expiresAt - Date.now() > 5 * 60 * 1000) return;
        supabase.auth.refreshSession().catch(() => {
          // Silent: keep existing session if refresh fails transiently
        });
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Check for existing session - don't block on getUser validation
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const nextUser = currentSession?.user ?? null;
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        // Hydrate profile in background
        ensureProfileExists(nextUser).then(setProfile);
      }
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((currentProfile) =>
      currentProfile ? { ...currentProfile, ...updates } : currentProfile
    );
  };

  const signOut = async () => {
    await hardSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
