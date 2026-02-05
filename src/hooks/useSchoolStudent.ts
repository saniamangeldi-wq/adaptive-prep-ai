import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSchoolStudent() {
  const { user, profile } = useAuth();
  const [isSchoolStudent, setIsSchoolStudent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Elite users (Tier 3) have access regardless of school status
  const isElite = profile?.tier === "tier_3";

  useEffect(() => {
    async function checkSchoolMembership() {
      if (!user) {
        setIsSchoolStudent(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("school_members")
          .select("school_id, role, status")
          .eq("user_id", user.id)
          .eq("role", "student")
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          console.error("Error checking school membership:", error);
          setIsSchoolStudent(false);
        } else if (data) {
          setIsSchoolStudent(true);
          setSchoolId(data.school_id);
        } else {
          setIsSchoolStudent(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setIsSchoolStudent(false);
      } finally {
        setLoading(false);
      }
    }

    checkSchoolMembership();
  }, [user]);

  // User has access if they're a school student OR Elite tier
  const hasUniversityMatchAccess = isSchoolStudent || isElite;
  
  return { isSchoolStudent, loading, schoolId, isElite, hasUniversityMatchAccess };
}
