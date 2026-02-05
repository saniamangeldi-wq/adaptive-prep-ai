import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SchoolAffiliation {
  type: "school";
  id: string;
  name: string;
  inviteCode: string;
}

interface TutorAffiliation {
  type: "tutor";
  id: string;
  name: string;
  tutorUserId: string;
}

export type Affiliation = SchoolAffiliation | TutorAffiliation | null;

export function useStudentAffiliation() {
  const { user } = useAuth();
  const [affiliation, setAffiliation] = useState<Affiliation>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAffiliation() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if student belongs to a school
        const { data: schoolMember } = await supabase
          .from("school_members")
          .select("school_id, schools(id, name, invite_code)")
          .eq("user_id", user.id)
          .eq("role", "student")
          .maybeSingle();

        if (schoolMember?.schools) {
          const school = schoolMember.schools as { id: string; name: string; invite_code: string };
          setAffiliation({
            type: "school",
            id: school.id,
            name: school.name,
            inviteCode: school.invite_code,
          });
          setLoading(false);
          return;
        }

        // Check if student has a tutor
        const { data: tutorStudent } = await supabase
          .from("tutor_students")
          .select("tutor_id")
          .eq("student_id", user.id)
          .maybeSingle();

        if (tutorStudent) {
          // Get tutor profile
          const { data: tutorProfile } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("user_id", tutorStudent.tutor_id)
            .maybeSingle();

          if (tutorProfile) {
            setAffiliation({
              type: "tutor",
              id: tutorStudent.tutor_id,
              name: tutorProfile.full_name || "My Tutor",
              tutorUserId: tutorProfile.user_id,
            });
          }
        }
      } catch (error) {
        console.error("Error loading affiliation:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAffiliation();
  }, [user?.id]);

  return { affiliation, loading };
}
