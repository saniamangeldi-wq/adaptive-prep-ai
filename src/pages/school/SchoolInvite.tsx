import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Copy, 
  Check,
  Mail,
  UserPlus,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
 import { PendingRequests } from "@/components/invite/PendingRequests";

export default function SchoolInvite() {
  const { profile } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
   const [schoolId, setSchoolId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!profile?.user_id) return;

      try {
        const { data: memberData } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", profile.user_id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (memberData?.school_id) {
           setSchoolId(memberData.school_id);
          // Get school name
          const { data: schoolData } = await supabase
            .from("schools")
            .select("name")
            .eq("id", memberData.school_id)
            .single();

          if (schoolData) {
            setSchoolName(schoolData.name);
          }

          // Get admin's personal invite code
          const { data: codeData } = await supabase
            .from("admin_invite_codes")
            .select("invite_code")
            .eq("admin_user_id", profile.user_id)
            .eq("school_id", memberData.school_id)
            .maybeSingle();

          if (codeData) {
            setInviteCode(codeData.invite_code);
          }
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolInfo();
  }, [profile?.user_id]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyLink = async () => {
    if (!inviteCode) return;

    const inviteLink = `${window.location.origin}/signup?school=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invite Members</h1>
          <p className="text-muted-foreground mt-2">
            Share your invite code with teachers and students to join {schoolName || "your school"}
          </p>
        </div>

        {/* Invite Code Card */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">School Invite Code</h3>
          </div>

          <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
            <p className="text-sm text-muted-foreground mb-3">Your unique invite code</p>
            <code className="text-3xl font-mono font-bold text-primary tracking-[0.3em]">
              {inviteCode || "--------"}
            </code>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleCopyCode}
              disabled={!inviteCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
              disabled={!inviteCode}
            >
              <Mail className="w-4 h-4" />
              Copy Invite Link
            </Button>
          </div>
        </div>

         {/* Pending Requests */}
         {schoolId && (
           <PendingRequests targetType="school" targetId={schoolId} />
         )}
 
        {/* Instructions */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">How it works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Share the code</p>
                <p className="text-sm text-muted-foreground">
                  Send the invite code to teachers and students via email or message
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">They request to join</p>
                <p className="text-sm text-muted-foreground">
                  Teachers and students enter the code in their dashboard to request access
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Approve and manage</p>
                <p className="text-sm text-muted-foreground">
                  Review pending requests above and approve teachers and students separately
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
