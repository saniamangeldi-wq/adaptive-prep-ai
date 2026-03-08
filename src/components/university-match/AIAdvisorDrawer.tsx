import { UniversityAIAdvisor } from "./UniversityAIAdvisor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GraduationCap, Sparkles } from "lucide-react";

interface AIAdvisorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topUniversities: Array<{ name: string; country: string; match_score: number }>;
  selectedUniversity: string | null;
  onUniversityChange: (u: string | null) => void;
}

export function AIAdvisorDrawer({
  open,
  onOpenChange,
  topUniversities,
  selectedUniversity,
  onUniversityChange,
}: AIAdvisorDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            University AI Advisor
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <UniversityAIAdvisor
            topUniversities={topUniversities}
            initialUniversity={selectedUniversity}
            onUniversityChange={onUniversityChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
