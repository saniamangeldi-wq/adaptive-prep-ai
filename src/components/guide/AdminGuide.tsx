import {
  Building2, Users, GraduationCap, BarChart3, MessageSquare,
  ClipboardList, CreditCard, Shield, Settings, UserPlus
} from "lucide-react";
import { GuideHeader } from "./GuideHeader";
import { GuideSection } from "./GuideSection";

export function AdminGuide() {
  return (
    <div className="max-w-3xl mx-auto">
      <GuideHeader
        role="School Admin"
        icon={Building2}
        subtitle="Manage your school, teachers, and students"
      />

      <div className="space-y-3">
        <GuideSection
          title="Getting Started"
          icon={Building2}
          description="Set up and configure your school"
          defaultOpen
          items={[
            { text: "Create your school with accurate name and details", type: "do" },
            { text: "Share your school invite code with teachers and students", type: "do" },
            { text: "Assign subjects and grade levels to teachers promptly", type: "do" },
            { text: "Review and approve pending join requests regularly", type: "do" },
            { text: "Don't share the invite code publicly — only with verified staff and students", type: "dont" },
            { text: "Don't delay teacher assignments — they need access to manage classrooms", type: "dont" },
          ]}
        />

        <GuideSection
          title="School Overview"
          icon={Settings}
          description="Dashboard with key school metrics"
          items={[
            { text: "Check the overview daily for a quick snapshot of school activity", type: "do" },
            { text: "Monitor total students, teachers, and active engagement", type: "do" },
            { text: "Use insights to make data-driven decisions", type: "do" },
            { text: "Don't ignore warning indicators like declining engagement", type: "dont" },
          ]}
        />

        <GuideSection
          title="Teacher Management"
          icon={Users}
          description="Add and manage teaching staff"
          items={[
            { text: "Approve teacher join requests after verifying their identity", type: "do" },
            { text: "Assign specific subjects and grade levels to each teacher", type: "do" },
            { text: "Update teacher assignments as schedules or roles change", type: "do" },
            { text: "Don't approve unknown teacher requests — verify credentials first", type: "dont" },
            { text: "Don't leave teachers without subject assignments — they can't manage classes", type: "dont" },
          ]}
        />

        <GuideSection
          title="Student Management"
          icon={GraduationCap}
          description="Enroll and manage student accounts"
          items={[
            { text: "Approve student join requests after verifying enrollment", type: "do" },
            { text: "Monitor student engagement and flag inactive accounts", type: "do" },
            { text: "Ensure student count stays within your plan limits", type: "do" },
            { text: "Watch for duplicate account flags and resolve them", type: "do" },
            { text: "Don't approve requests from unknown users", type: "dont" },
            { text: "Don't ignore duplicate account warnings — they may indicate issues", type: "dont" },
          ]}
        />

        <GuideSection
          title="Invite Codes"
          icon={UserPlus}
          description="Manage how people join your school"
          items={[
            { text: "Share the invite code through official school communication channels", type: "do" },
            { text: "Regenerate the invite code if it gets leaked to unauthorized people", type: "do" },
            { text: "Keep a record of who you've shared the code with", type: "do" },
            { text: "Don't post invite codes on social media or public forums", type: "dont" },
          ]}
        />

        <GuideSection
          title="AI Insights"
          icon={MessageSquare}
          description="Use AI for school-level insights"
          items={[
            { text: "Use AI insights to understand school-wide performance trends", type: "do" },
            { text: "Ask the AI for recommendations on improving student outcomes", type: "do" },
            { text: "Review AI reports before sharing with stakeholders", type: "do" },
            { text: "Don't make major decisions based solely on AI — combine with human judgment", type: "dont" },
          ]}
        />

        <GuideSection
          title="Assignments"
          icon={ClipboardList}
          description="Oversee school-wide assignments"
          items={[
            { text: "Create school-wide assignments that target specific grades", type: "do" },
            { text: "Monitor assignment completion rates across the school", type: "do" },
            { text: "Coordinate with teachers to avoid assignment overload", type: "do" },
            { text: "Don't create assignments without checking teachers' existing workload", type: "dont" },
          ]}
        />

        <GuideSection
          title="Analytics"
          icon={BarChart3}
          description="School-wide performance data"
          items={[
            { text: "Review analytics weekly for trends in student performance", type: "do" },
            { text: "Compare performance across grade levels and subjects", type: "do" },
            { text: "Use analytics to evaluate teacher effectiveness", type: "do" },
            { text: "Share positive trends with staff to boost morale", type: "do" },
            { text: "Don't use analytics punitively — use them constructively", type: "dont" },
          ]}
        />

        <GuideSection
          title="Billing & Plans"
          icon={CreditCard}
          description="Manage your school subscription"
          items={[
            { text: "All school plans are custom-priced — contact us for a quote", type: "do" },
            { text: "Monitor student and teacher counts against plan limits", type: "do" },
            { text: "Plan ahead for enrollment increases each term", type: "do" },
            { text: "Don't let your plan expire — it affects all school members", type: "dont" },
            { text: "Don't exceed capacity limits without upgrading first", type: "dont" },
          ]}
        />

        <GuideSection
          title="Security & Compliance"
          icon={Shield}
          description="Protect school data and accounts"
          items={[
            { text: "Use a strong, unique password for your admin account", type: "do" },
            { text: "Review the duplicate accounts panel regularly for fraud detection", type: "do" },
            { text: "Ensure all teachers use verified email addresses", type: "do" },
            { text: "Sign out when using shared devices", type: "do" },
            { text: "Don't share admin credentials with anyone — create separate admin accounts", type: "dont" },
            { text: "Don't ignore security alerts or duplicate account warnings", type: "dont" },
          ]}
        />
      </div>
    </div>
  );
}
