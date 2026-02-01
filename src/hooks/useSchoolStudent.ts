import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSchoolStudent() {
  const { user } = useAuth();
  const [isSchoolStudent, setIsSchoolStudent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

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

  return { isSchoolStudent, loading, schoolId };
}
