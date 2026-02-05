import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Save, 
  Copy, 
  RefreshCw,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SchoolData {
  id: string;
  name: string;
  invite_code: string;
  ai_tier: number;
  student_count: number;
  teacher_count: number;
}

const tierNames: Record<number, string> = {
  1: "Starter",
  2: "Professional", 
  3: "Premium",
  4: "Enterprise"
};

export function SchoolSettingsSection() {
  const { user } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    async function fetchSchoolData() {
      if (!user?.id) return;

      try {
        // Get school membership
        const { data: membership } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", user.id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (!membership) {
          setLoading(false);
          return;
        }

        // Get school details
        const { data: schoolData } = await supabase
          .from("schools")
          .select("*")
          .eq("id", membership.school_id)
          .single();

        if (schoolData) {
          setSchool(schoolData);
          setSchoolName(schoolData.name);
        }

        // Get admin invite code
        const { data: codeData } = await supabase
          .from("admin_invite_codes")
          .select("invite_code")
          .eq("admin_user_id", user.id)
          .maybeSingle();

        if (codeData) {
          setAdminCode(codeData.invite_code);
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSchoolData();
  }, [user?.id]);

  const handleSaveSchoolName = async () => {
    if (!school || !schoolName.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({ name: schoolName })
        .eq("id", school.id);

      if (error) throw error;
      
      setSchool({ ...school, name: schoolName });
      toast.success("School name updated!");
    } catch (error: any) {
      toast.error("Failed to update school name");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code.toUpperCase());
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRegenerateCode = async () => {
    if (!school) return;

    try {
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from("schools")
        .update({ invite_code: newCode })
        .eq("id", school.id);

      if (error) throw error;
      
      setSchool({ ...school, invite_code: newCode });
      toast.success("School invite code regenerated!");
    } catch (error: any) {
      toast.error("Failed to regenerate code");
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border/50 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  if (!school) return null;

  const planName = tierNames[school.ai_tier] || "Starter";

  return (
    <div className="p-6 rounded-2xl bg-card border border-primary/30">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">School Settings</h3>
      </div>

      <div className="space-y-6">
        {/* School Name */}
        <div>
          <Label htmlFor="schoolName" className="text-foreground">School Name</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
            />
            <Button
              variant="hero"
              onClick={handleSaveSchoolName}
              disabled={saving || schoolName === school.name}
            >
              {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
            </Button>
          </div>
        </div>

        {/* Current Plan */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <span className="text-muted-foreground">Current Plan</span>
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {planName}
          </span>
        </div>

        {/* Invite Codes */}
        <div className="space-y-3">
          <Label className="text-foreground">Invite Codes</Label>
          
          {/* Student/Teacher Code (same code) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">School Invite Code</p>
              <p className="text-xs text-muted-foreground">For students & teachers to join</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1 rounded bg-background border border-border font-mono text-sm">
                {school.invite_code.toUpperCase()}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopyCode(school.invite_code, "Invite code")}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRegenerateCode}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Admin Code (if exists) */}
          {adminCode && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Admin Code</p>
                <p className="text-xs text-muted-foreground">Your personal admin code</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-1 rounded bg-background border border-border font-mono text-sm">
                  {adminCode.toUpperCase()}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyCode(adminCode, "Admin code")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h4>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
                Delete School
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{school.name}</strong> and all associated data including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All students and teachers</li>
                    <li>All assignments and grades</li>
                    <li>All calendar events</li>
                    <li>All curriculum data</li>
                  </ul>
                  <p className="mt-3 text-destructive font-medium">
                    This action cannot be undone.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => toast.error("School deletion is disabled for safety. Contact support.")}
                >
                  Delete School
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
