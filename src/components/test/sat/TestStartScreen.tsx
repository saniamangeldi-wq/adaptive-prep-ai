import { BookOpen, Calculator, Clock, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAT_TEST_STRUCTURE } from "@/lib/sat-test-config";

interface TestStartScreenProps {
  onStart: () => void;
  isLoading?: boolean;
}

export function TestStartScreen({ onStart, isLoading }: TestStartScreenProps) {
  const rwSection = SAT_TEST_STRUCTURE.reading_writing;
  const mathSection = SAT_TEST_STRUCTURE.math;
  const totalQuestions = rwSection.totalQuestions + mathSection.totalQuestions;
  const totalTime = rwSection.totalTimeMinutes + mathSection.totalTimeMinutes + 10; // +10 for break

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            SAT Practice Test
          </h1>
          <p className="text-lg text-muted-foreground">
            Adaptive Digital SAT Format
          </p>
        </div>

        {/* Test Structure Card */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-xl font-semibold text-foreground">About This Test</h2>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Reading & Writing Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Reading and Writing</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  2 modules, {rwSection.modules[0].questions} questions each
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  {rwSection.modules[0].timeMinutes} minutes per module
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Total: {rwSection.totalTimeMinutes} minutes
                </li>
              </ul>
            </div>

            {/* Math Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calculator className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Math</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  2 modules, {mathSection.modules[0].questions} questions each
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {mathSection.modules[0].timeMinutes} minutes per module
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Total: {mathSection.totalTimeMinutes} minutes
                </li>
              </ul>
            </div>
          </div>

          {/* Test Details */}
          <div className="px-6 py-4 bg-muted/30 border-t border-border/50 grid sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
              <div className="text-xs text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">~{Math.floor(totalTime / 60)}h {totalTime % 60}m</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">4</div>
              <div className="text-xs text-muted-foreground">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">Adaptive</div>
              <div className="text-xs text-muted-foreground">Format</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Before You Begin
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Find a quiet place with no distractions",
              "You'll get a 10-minute break after Reading & Writing",
              "You can flag questions to review later",
              "Navigate back and forth within each module",
              "Once you finish a module, you cannot return to it",
              "Calculator available for entire Math section",
            ].map((instruction, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{instruction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            variant="hero"
            size="xl"
            className="px-12"
            onClick={onStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing Test...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Begin Test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
