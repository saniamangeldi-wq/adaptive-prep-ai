import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BookOpen } from "lucide-react";

export default function LessonsComingSoon() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center text-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Lessons</h1>
        <p className="text-muted-foreground max-w-md">
          Coming soon — interactive VAK-adapted lessons are on the way.
        </p>
      </div>
    </DashboardLayout>
  );
}
