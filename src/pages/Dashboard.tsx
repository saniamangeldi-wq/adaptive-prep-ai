import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { TutorDashboard } from "@/components/dashboard/TutorDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { PageSeo } from "@/components/seo/PageSeo";

export default function Dashboard() {
  const { profile } = useAuth();

  const renderDashboard = () => {
    switch (profile?.role) {
      case "tutor":
        return <TutorDashboard />;
      case "teacher":
        return <TeacherDashboard />;
      case "school_admin":
        return <AdminDashboard />;
      case "student":
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <>
      <PageSeo
        title="Dashboard | AdaptivePrep"
        description="Your AdaptivePrep dashboard with personalized SAT prep insights, practice tests, and AI coaching."
        path="/dashboard"
      />
      <DashboardLayout>
        {renderDashboard()}
      </DashboardLayout>
    </>
  );
}
