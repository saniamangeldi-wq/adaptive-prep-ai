import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "student" | "tutor" | "teacher" | "school_admin";
  tier: "tier_0" | "tier_1" | "tier_2" | "tier_3";
  learning_style: "visual" | "auditory" | "reading_writing" | "kinesthetic" | null;
  credits_remaining: number;
  tests_remaining: number;
  onboarding_completed: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  trial_started_at: string | null;
  questions_used_today: number;
  questions_reset_at: string | null;
  flashcards_created_today: number;
  flashcards_reset_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    const role = ((currentUser.user_metadata as any)?.role as Profile["role"]) || "student";

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: currentUser.id,
        email: currentUser.email ?? "",
        full_name: fullName,
        avatar_url: avatarUrl,
        role,
        // Align with trial defaults used elsewhere in the app
        tier: "tier_2",
        is_trial: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        credits_remaining: 100,
        tests_remaining: 2,
        questions_used_today: 0,
        onboarding_completed: false,
      })
      .select("*")
      .single();

    if (insertError) {
      // If RLS or constraints block insert, don't break auth; just proceed without profile.
      console.error("Error creating missing profile:", insertError);
      return null;
    }

    return inserted as Profile;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Update state immediately - don't block on validation
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
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const signOut = async () => {
    await hardSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
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
