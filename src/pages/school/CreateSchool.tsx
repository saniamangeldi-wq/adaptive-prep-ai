import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateSchool() {
  const { profile, refreshProfile } = useAuth();
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;

    setLoading(true);
    try {
      // Create the school
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: schoolName,
          created_by: profile.user_id,
          tier: profile.tier,
        })
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Add the user as school admin
      const { error: memberError } = await supabase
        .from("school_members")
        .insert({
          school_id: school.id,
          user_id: profile.user_id,
          role: "school_admin",
          status: "active",
        });

      if (memberError) throw memberError;

      toast.success("School created successfully!");
      await refreshProfile();
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast.error(error.message || "Failed to create school");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Your School</h1>
          <p className="text-muted-foreground mt-2">
            Set up your school to invite teachers and students
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <form onSubmit={handleCreateSchool} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="Enter your school name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h3 className="font-medium text-foreground mb-2">What you'll get:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Unique invite code for teachers and students
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  School-wide analytics dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Teacher and student management
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Performance tracking across all students
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full h-12"
              disabled={loading || !schoolName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating School...
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  Create School
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
