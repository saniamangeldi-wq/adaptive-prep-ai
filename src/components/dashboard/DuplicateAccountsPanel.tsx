import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Check, X, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DuplicateFlag {
  id: string;
  new_email: string;
  existing_email: string;
  new_name: string | null;
  existing_name: string | null;
  similarity_reason: string;
  status: string;
  created_at: string;
}

export function DuplicateAccountsPanel() {
  const { profile } = useAuth();
  const [flags, setFlags] = useState<DuplicateFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from("duplicate_account_flags")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFlags(data as unknown as DuplicateFlag[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (profile?.role === "school_admin") {
      fetchFlags();
    }
  }, [profile?.role]);

  const handleReview = async (flagId: string, decision: "confirmed" | "dismissed") => {
    const { error } = await supabase
      .from("duplicate_account_flags")
      .update({
        status: decision,
        reviewed_by: profile?.user_id,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", flagId);

    if (error) {
      toast.error("Failed to update flag");
      return;
    }

    toast.success(decision === "confirmed" ? "Marked as duplicate" : "Dismissed - not a duplicate");
    fetchFlags();
  };

  if (profile?.role !== "school_admin") return null;

  const pendingFlags = flags.filter((f) => f.status === "pending");
  const reviewedFlags = flags.filter((f) => f.status !== "pending");

  if (isLoading) return null;

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Duplicate Account Detection</h3>
        </div>
        {pendingFlags.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
            {pendingFlags.length} pending
          </span>
        )}
      </div>

      {pendingFlags.length === 0 && reviewedFlags.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <UserX className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No duplicate accounts detected</p>
          <p className="text-xs mt-1">
            The system automatically flags similar accounts on signup
          </p>
        </div>
      )}

      {/* Pending flags */}
      {pendingFlags.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Needs Review
          </p>
          {pendingFlags.map((flag) => (
            <div
              key={flag.id}
              className="p-4 rounded-xl bg-warning/5 border border-warning/20"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Possible duplicate detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {flag.similarity_reason}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-2 rounded-lg bg-card border border-border/50">
                      <p className="text-xs text-muted-foreground">New Account</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {flag.new_name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {flag.new_email}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/50">
                      <p className="text-xs text-muted-foreground">Existing Account</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {flag.existing_name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {flag.existing_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleReview(flag.id, "confirmed")}
                    >
                      <Check className="w-3 h-3" />
                      Yes, same person
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleReview(flag.id, "dismissed")}
                    >
                      <X className="w-3 h-3" />
                      Not the same
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviewed flags */}
      {reviewedFlags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Previously Reviewed
          </p>
          {reviewedFlags.slice(0, 5).map((flag) => (
            <div
              key={flag.id}
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                flag.status === "confirmed"
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-muted/30 border-border/50"
              )}
            >
              <div className="min-w-0">
                <p className="text-xs text-foreground truncate">
                  {flag.new_email} ↔ {flag.existing_email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {flag.similarity_reason}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                  flag.status === "confirmed"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {flag.status === "confirmed" ? "Duplicate" : "Dismissed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
