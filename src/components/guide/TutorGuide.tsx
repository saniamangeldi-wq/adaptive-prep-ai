import {
  Users, MessageSquare, ClipboardList, Trophy, BarChart3,
  Calendar, CreditCard, Shield, UserPlus, BookOpen
} from "lucide-react";
import { GuideHeader } from "./GuideHeader";
import { GuideSection } from "./GuideSection";

export function TutorGuide() {
  return (
    <div className="max-w-3xl mx-auto">
      <GuideHeader
        role="Tutor"
        icon={Users}
        subtitle="Manage your students and help them succeed"
      />

      <div className="space-y-3">
        <GuideSection
          title="Getting Started"
          icon={BookOpen}
          description="Set up your tutoring practice"
          defaultOpen
          items={[
            { text: "Share your unique invite code with students to get them onboarded", type: "do" },
            { text: "Review pending join requests promptly — students are waiting!", type: "do" },
            { text: "Choose a subscription tier that matches your student count", type: "do" },
            { text: "Don't share your invite code publicly — only with intended students", type: "dont" },
            { text: "Don't exceed your plan's student limit — upgrade before adding more", type: "dont" },
          ]}
        />

        <GuideSection
          title="Student Management"
          icon={UserPlus}
          description="Add, manage, and monitor your students"
          items={[
            { text: "Approve join requests from the My Students page", type: "do" },
            { text: "Students get automatically upgraded to your plan tier when approved", type: "do" },
            { text: "Keep track of student activity and engagement regularly", type: "do" },
            { text: "Don't remove students without warning — communicate first", type: "dont" },
            { text: "Don't accept requests from students you don't intend to tutor", type: "dont" },
          ]}
        />

        <GuideSection
          title="Assignments"
          icon={ClipboardList}
          description="Create and manage student assignments"
          items={[
            { text: "Create assignments with clear instructions and due dates", type: "do" },
            { text: "Set point values to help students track their progress", type: "do" },
            { text: "Review and grade submissions promptly with constructive feedback", type: "do" },
            { text: "Use different subjects and types to cover all SAT areas", type: "do" },
            { text: "Don't overload students with too many assignments at once", type: "dont" },
            { text: "Don't leave submissions ungraded for too long", type: "dont" },
          ]}
        />

        <GuideSection
          title="Leaderboard"
          icon={Trophy}
          description="Track student rankings and motivation"
          items={[
            { text: "Use the leaderboard to identify top performers and those needing help", type: "do" },
            { text: "Celebrate student achievements and streaks", type: "do" },
            { text: "Don't use the leaderboard to shame struggling students", type: "dont" },
          ]}
        />

        <GuideSection
          title="AI Coach"
          icon={MessageSquare}
          description="Use AI to support your tutoring"
          items={[
            { text: "Use the AI Coach to prepare study materials and explanations", type: "do" },
            { text: "Get AI-generated insights on common student mistakes", type: "do" },
            { text: "Don't rely solely on AI — your personal guidance matters most", type: "dont" },
          ]}
        />

        <GuideSection
          title="Student Progress & Analytics"
          icon={BarChart3}
          description="Monitor how your students are performing"
          items={[
            { text: "Review analytics regularly to spot struggling students early", type: "do" },
            { text: "Look at score trends, not just individual test results", type: "do" },
            { text: "Use data to customize your tutoring approach per student", type: "do" },
            { text: "Don't ignore declining trends — intervene early", type: "dont" },
          ]}
        />

        <GuideSection
          title="Schedule"
          icon={Calendar}
          description="Manage your tutoring calendar"
          items={[
            { text: "Add tutoring sessions and deadlines to the calendar", type: "do" },
            { text: "Keep your schedule updated so students know availability", type: "do" },
            { text: "Don't double-book — check existing events before adding new ones", type: "dont" },
          ]}
        />

        <GuideSection
          title="Billing & Plans"
          icon={CreditCard}
          description="Manage your subscription"
          items={[
            { text: "Solo Tutor ($59/mo): up to 5 students", type: "do" },
            { text: "Professional ($169/mo): up to 15 students + 60 voice minutes", type: "do" },
            { text: "Tutor Business ($449/mo): up to 40 students + 200+ voice minutes", type: "do" },
            { text: "Upgrade before hitting your student limit to avoid disruption", type: "do" },
            { text: "Don't forget: yearly billing saves 20%", type: "dont" },
          ]}
        />

        <GuideSection
          title="Account & Security"
          icon={Shield}
          description="Keep your account safe"
          items={[
            { text: "Use a strong password and keep your credentials private", type: "do" },
            { text: "Regenerate your invite code if it gets shared unintentionally", type: "do" },
            { text: "Don't share your login with assistants — each person needs their own account", type: "dont" },
          ]}
        />
      </div>
    </div>
  );
}
