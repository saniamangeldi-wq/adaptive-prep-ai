import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { TeacherAICoach } from "@/components/ai/TeacherAICoach";
import { AdminAICoach } from "@/components/ai/AdminAICoach";

export default function AICoach() {
  const { profile } = useAuth();

  // Render role-specific AI coach
  const renderAICoach = () => {
    switch (profile?.role) {
      case "school_admin":
        return <AdminAICoach />;
      case "teacher":
      case "tutor":
        return <TeacherAICoach />;
      case "student":
      default:
        return <StudentAICoach />;
    }
  };

  return (
    <DashboardLayout>
      {renderAICoach()}
    </DashboardLayout>
  );
}
