import {
  Users, MessageSquare, ClipboardList, BarChart3, Calendar,
  Layers, Shield, BookOpen, School
} from "lucide-react";
import { GuideHeader } from "./GuideHeader";
import { GuideSection } from "./GuideSection";

export function TeacherGuide() {
  return (
    <div className="max-w-3xl mx-auto">
      <GuideHeader
        role="Teacher"
        icon={BookOpen}
        subtitle="Manage your classroom and support student learning"
      />

      <div className="space-y-3">
        <GuideSection
          title="Getting Started"
          icon={School}
          description="Your role within the school"
          defaultOpen
          items={[
            { text: "You are part of a school managed by a School Admin", type: "do" },
            { text: "Your subjects and grade levels are assigned by the admin", type: "do" },
            { text: "Focus on teaching and creating assignments — admin handles enrollment", type: "do" },
            { text: "Don't try to invite or manage students directly — that's the admin's role", type: "dont" },
            { text: "Don't change your assigned subjects without coordinating with admin", type: "dont" },
          ]}
        />

        <GuideSection
          title="My Classroom"
          icon={Users}
          description="View and interact with your students"
          items={[
            { text: "Check your classroom regularly to see enrolled students", type: "do" },
            { text: "Monitor which students are active and engaged", type: "do" },
            { text: "Communicate with students through assignments and feedback", type: "do" },
            { text: "Don't remove students from your classroom — contact the admin instead", type: "dont" },
          ]}
        />

        <GuideSection
          title="Assignments"
          icon={ClipboardList}
          description="Create, assign, and grade student work"
          items={[
            { text: "Create assignments with clear titles, descriptions, and due dates", type: "do" },
            { text: "Specify the subject and grade level for proper targeting", type: "do" },
            { text: "Grade submissions with detailed feedback to help students improve", type: "do" },
            { text: "Use 'draft' status to prepare assignments before publishing", type: "do" },
            { text: "Don't publish assignments without clear instructions", type: "dont" },
            { text: "Don't set unrealistic deadlines — give students adequate time", type: "dont" },
            { text: "Don't leave grading pending for more than a week", type: "dont" },
          ]}
        />

        <GuideSection
          title="AI Coach"
          icon={MessageSquare}
          description="Leverage AI for teaching support"
          items={[
            { text: "Use AI to generate explanations for difficult concepts", type: "do" },
            { text: "Ask the AI for lesson plan ideas and study material suggestions", type: "do" },
            { text: "Use AI insights to understand common student misconceptions", type: "do" },
            { text: "Don't use AI-generated content without reviewing it first", type: "dont" },
          ]}
        />

        <GuideSection
          title="Class Analytics"
          icon={BarChart3}
          description="Track classroom performance"
          items={[
            { text: "Review class-wide analytics to identify trends", type: "do" },
            { text: "Spot students who are falling behind early", type: "do" },
            { text: "Use data to adjust your teaching strategy", type: "do" },
            { text: "Don't compare individual students publicly — use data privately", type: "dont" },
          ]}
        />

        <GuideSection
          title="Calendar"
          icon={Calendar}
          description="Stay organized with events and deadlines"
          items={[
            { text: "Add class events, exams, and deadlines to the calendar", type: "do" },
            { text: "Assignment due dates automatically appear on the calendar", type: "do" },
            { text: "Check the calendar at the start of each week for planning", type: "do" },
            { text: "Don't schedule conflicting events without checking first", type: "dont" },
          ]}
        />

        <GuideSection
          title="Resources (Flashcards)"
          icon={Layers}
          description="Create and share study materials"
          items={[
            { text: "Create flashcard decks for your students to study", type: "do" },
            { text: "Use AI to generate flashcards from curriculum topics", type: "do" },
            { text: "Organize decks by subject and difficulty level", type: "do" },
            { text: "Don't create decks with errors — review AI-generated content", type: "dont" },
          ]}
        />

        <GuideSection
          title="Account & Security"
          icon={Shield}
          description="Protect your account"
          items={[
            { text: "Use a strong password and enable email verification", type: "do" },
            { text: "Sign out when using shared school devices", type: "do" },
            { text: "Report any suspicious activity to your school admin", type: "do" },
            { text: "Don't share your credentials with colleagues", type: "dont" },
          ]}
        />
      </div>
    </div>
  );
}
