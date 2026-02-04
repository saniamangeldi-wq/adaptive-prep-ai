import { Clock, FileText, Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULE_DIRECTIONS } from "@/lib/sat-test-config";

interface ModuleDirectionsProps {
  section: "reading_writing" | "math";
  moduleNumber: 1 | 2;
  onStart: () => void;
}

export function ModuleDirections({ section, moduleNumber, onStart }: ModuleDirectionsProps) {
  const directions = MODULE_DIRECTIONS[section][moduleNumber];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Module Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {section === "math" ? (
              <Calculator className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {section === "math" ? "Math Section" : "Reading and Writing Section"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            {directions.title}
          </h1>
        </div>

        {/* Module Info Badges */}
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{directions.time}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{directions.questions} Questions</span>
          </div>
        </div>

        {/* Directions Card */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-semibold text-foreground">Directions</h2>
          </div>
          <div className="p-6">
            <p className="text-foreground whitespace-pre-line leading-relaxed">
              {directions.text}
            </p>
          </div>
        </div>

        {/* Calculator Notice for Math */}
        {section === "math" && (
          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calculator className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Calculator Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A Desmos calculator is available for this section. Click the calculator icon in the top menu to open it.
              </p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-center">
          <Button variant="hero" size="xl" onClick={onStart}>
            Begin Module
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
