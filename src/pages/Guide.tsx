import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentGuide } from "@/components/guide/StudentGuide";
import { TutorGuide } from "@/components/guide/TutorGuide";
import { TeacherGuide } from "@/components/guide/TeacherGuide";
import { AdminGuide } from "@/components/guide/AdminGuide";

export default function Guide() {
  const { profile } = useAuth();

  const renderGuide = () => {
    switch (profile?.role) {
      case "tutor":
        return <TutorGuide />;
      case "teacher":
        return <TeacherGuide />;
      case "school_admin":
        return <AdminGuide />;
      case "student":
      default:
        return <StudentGuide />;
    }
  };

  return <DashboardLayout>{renderGuide()}</DashboardLayout>;
}
