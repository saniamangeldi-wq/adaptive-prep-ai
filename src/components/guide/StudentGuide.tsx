import {
  BookOpen, MessageSquare, Layers, LineChart, FolderOpen, GraduationCap,
  Brain, CreditCard, ClipboardList, Calendar, Shield
} from "lucide-react";
import { GuideHeader } from "./GuideHeader";
import { GuideSection } from "./GuideSection";

export function StudentGuide() {
  return (
    <div className="max-w-3xl mx-auto">
      <GuideHeader
        role="Student"
        icon={BookOpen}
        subtitle="Everything you need to ace the SAT and beyond"
      />

      <div className="space-y-3">
        <GuideSection
          title="Getting Started"
          icon={Brain}
          description="Complete onboarding and set up your profile"
          defaultOpen
          items={[
            { text: "Complete the VAK learning style assessment during onboarding — it personalizes your AI experience", type: "do" },
            { text: "Set your target SAT score in Settings to track progress toward your goal", type: "do" },
            { text: "Choose your grade level and study subjects accurately", type: "do" },
            { text: "Don't skip onboarding — the AI needs your learning style to help effectively", type: "dont" },
            { text: "Don't leave your profile incomplete — it limits personalization", type: "dont" },
          ]}
        />

        <GuideSection
          title="Practice Tests"
          icon={BookOpen}
          description="Take SAT practice tests and track scores"
          items={[
            { text: "Start with a full-length test to benchmark your current level", type: "do" },
            { text: "Review wrong answers after each test — understanding mistakes is key", type: "do" },
            { text: "Take tests under timed conditions to simulate the real SAT", type: "do" },
            { text: "Use the AI Coach to get help with questions you got wrong", type: "do" },
            { text: "Don't rush through tests just to complete them — quality over quantity", type: "dont" },
            { text: "Don't ignore flagged questions — review them before submitting", type: "dont" },
          ]}
        />

        <GuideSection
          title="AI Study Coach"
          icon={MessageSquare}
          description="Get personalized help from your AI tutor"
          items={[
            { text: "Ask specific questions about concepts you don't understand", type: "do" },
            { text: "Share screenshots of problems for the AI to analyze", type: "do" },
            { text: "Use Spaces to organize conversations by subject", type: "do" },
            { text: "Try voice chat for a more natural tutoring experience", type: "do" },
            { text: "Don't ask the AI to solve entire tests for you — use it to learn", type: "dont" },
            { text: "Don't waste credits on casual conversation — focus on study topics", type: "dont" },
            { text: "Don't ignore AI suggestions — they're tailored to your weak areas", type: "dont" },
          ]}
        />

        <GuideSection
          title="Spaces"
          icon={FolderOpen}
          description="Organize your AI conversations by topic"
          items={[
            { text: "Create separate spaces for Math, Reading, and Writing sections", type: "do" },
            { text: "Add custom AI instructions to each space for focused help", type: "do" },
            { text: "Upload reference materials to spaces for context-aware assistance", type: "do" },
            { text: "Don't create too many overlapping spaces — keep them focused", type: "dont" },
          ]}
        />

        <GuideSection
          title="Smart Flashcards"
          icon={Layers}
          description="Review and memorize key concepts"
          items={[
            { text: "Use AI-generated flashcards based on your weak areas", type: "do" },
            { text: "Review flashcards daily for best retention", type: "do" },
            { text: "Rate card difficulty honestly to optimize spaced repetition", type: "do" },
            { text: "Don't just flip through cards without thinking — actively recall answers", type: "dont" },
          ]}
        />

        <GuideSection
          title="Progress Tracking"
          icon={LineChart}
          description="Monitor your improvement over time"
          items={[
            { text: "Check your progress dashboard regularly to see score trends", type: "do" },
            { text: "Focus on areas where your accuracy is lowest", type: "do" },
            { text: "Celebrate streaks and badges — they keep you motivated!", type: "do" },
            { text: "Don't get discouraged by one bad score — look at the overall trend", type: "dont" },
          ]}
        />

        <GuideSection
          title="University Match"
          icon={GraduationCap}
          description="Find universities that fit your profile"
          items={[
            { text: "Complete the preference questionnaire for accurate matches", type: "do" },
            { text: "Upload your portfolio for better AI advisor recommendations", type: "do" },
            { text: "Use the Financial Readiness Planner to budget for university", type: "do" },
            { text: "Save universities to your shortlist for easy comparison", type: "do" },
            { text: "Don't rely solely on rankings — consider fit, culture, and finances", type: "dont" },
          ]}
        />

        <GuideSection
          title="School Features (If Enrolled)"
          icon={ClipboardList}
          description="Assignments, grades, and calendar for school students"
          items={[
            { text: "Check Assignments regularly for new tasks from your teachers", type: "do" },
            { text: "Submit assignments before the due date", type: "do" },
            { text: "Review grades and teacher feedback to improve", type: "do" },
            { text: "Use the Calendar to stay on top of deadlines and events", type: "do" },
            { text: "Don't ignore assignment notifications — late submissions lose points", type: "dont" },
          ]}
        />

        <GuideSection
          title="Billing & Credits"
          icon={CreditCard}
          description="Manage your subscription and AI credits"
          items={[
            { text: "Monitor your remaining AI credits and test attempts on the dashboard", type: "do" },
            { text: "Upgrade your plan if you need more credits or features", type: "do" },
            { text: "Credits reset monthly — use them or lose them", type: "do" },
            { text: "Don't let your credits expire without using them", type: "dont" },
          ]}
        />

        <GuideSection
          title="Account Safety"
          icon={Shield}
          description="Keep your account secure"
          items={[
            { text: "Use a strong, unique password for your account", type: "do" },
            { text: "Verify your email address to secure your account", type: "do" },
            { text: "Sign out when using shared or public devices", type: "do" },
            { text: "Don't share your login credentials with anyone", type: "dont" },
            { text: "Don't create multiple accounts — it may get flagged", type: "dont" },
          ]}
        />
      </div>
    </div>
  );
}
