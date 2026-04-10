import { cn } from "@/lib/utils";
import { useState } from "react";
import type { WordTimestamp } from "../LessonPlayer";

interface InteractiveScenario {
  setup: string;
  steps: Array<{
    instruction: string;
    action_type: "click" | "drag" | "order" | "select";
    options?: string[];
    correct_index?: number;
  }>;
  real_world_connection: string;
}

interface KinestheticSlideProps {
  slide: {
    heading: string;
    subheading?: string;
    bullets?: string[];
    highlight_terms?: string[];
    interactive_scenario?: InteractiveScenario;
  };
  isNarrating: boolean;
  narrationProgress: number;
  currentTime: number;
  wordTimestamps: WordTimestamp[];
  getBulletState: (idx: number) => "visible" | "revealed" | "active" | "hidden";
  renderBulletContent: (bullet: string, idx: number, state: string) => React.ReactNode;
}

function SelectStep({ step, onComplete }: { step: InteractiveScenario["steps"][0]; onComplete: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const isCorrect = selected === step.correct_index;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{step.instruction}</p>
      <div className="grid grid-cols-2 gap-2">
        {step.options?.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              setSelected(i);
              if (i === step.correct_index) setTimeout(onComplete, 800);
            }}
            disabled={selected !== null}
            className={cn(
              "p-3 rounded-lg border text-sm text-left transition-all duration-300",
              selected === null && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
              selected === i && i === step.correct_index && "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
              selected === i && i !== step.correct_index && "border-red-500 bg-red-500/10 animate-[shake_0.3s_ease-in-out]",
              selected !== null && selected !== i && "opacity-50"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderStep({ step, onComplete }: { step: InteractiveScenario["steps"][0]; onComplete: () => void }) {
  const [items, setItems] = useState(step.options || []);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx, 1);
    newItems.splice(targetIdx, 0, moved);
    setItems(newItems);
    setDragIdx(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{step.instruction}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={item}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className={cn(
              "p-2.5 rounded-lg border border-border bg-card text-sm cursor-grab active:cursor-grabbing transition-all",
              dragIdx === i && "opacity-50 scale-95"
            )}
          >
            <span className="text-muted-foreground mr-2">{i + 1}.</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClickStep({ step, onComplete }: { step: InteractiveScenario["steps"][0]; onComplete: () => void }) {
  const [clicked, setClicked] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{step.instruction}</p>
      <button
        onClick={() => { setClicked(true); setTimeout(onComplete, 500); }}
        disabled={clicked}
        className={cn(
          "w-full p-4 rounded-lg border-2 border-dashed text-sm font-medium transition-all duration-300",
          clicked
            ? "border-primary bg-primary/10 text-primary"
            : "border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer"
        )}
      >
        {clicked ? "✓ Done!" : "Tap to proceed"}
      </button>
    </div>
  );
}

export function KinestheticSlide({
  slide,
  isNarrating,
  narrationProgress,
  getBulletState,
  renderBulletContent,
}: KinestheticSlideProps) {
  const scenario = slide.interactive_scenario;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const markComplete = (idx: number) => {
    setCompletedSteps(prev => new Set([...prev, idx]));
  };

  const renderStep = (step: InteractiveScenario["steps"][0], idx: number) => {
    if (completedSteps.has(idx)) {
      return <div className="p-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">✅ Step completed</div>;
    }
    switch (step.action_type) {
      case "select": return <SelectStep step={step} onComplete={() => markComplete(idx)} />;
      case "order": return <OrderStep step={step} onComplete={() => markComplete(idx)} />;
      case "click":
      case "drag":
      default: return <ClickStep step={step} onComplete={() => markComplete(idx)} />;
    }
  };

  return (
    <div className="space-y-4 h-full">
      {/* Condensed bullets */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-2">{slide.heading}</h2>
        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-1.5">
            {slide.bullets.map((bullet, i) => {
              const state = getBulletState(i);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 text-sm transition-all duration-500",
                    state === "hidden" && "opacity-0",
                    state === "active" && "opacity-100 text-foreground",
                    state === "revealed" && "opacity-60",
                    state === "visible" && "opacity-100"
                  )}
                >
                  <span className={cn("mt-1 h-1.5 w-1.5 rounded-full shrink-0", state === "active" ? "bg-primary" : "bg-primary/40")} />
                  <span>{renderBulletContent(bullet, i, state)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Interactive scenario panel */}
      {scenario && (
        <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
          {/* Setup */}
          <div className="border-l-4 border-primary bg-primary/10 p-4">
            <p className="text-sm text-foreground leading-relaxed">{scenario.setup}</p>
          </div>

          {/* Real world badge */}
          <div className="px-4 py-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              🌍 {scenario.real_world_connection}
            </span>
          </div>

          {/* Steps */}
          <div className="px-4 pb-4 space-y-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {scenario.steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    completedSteps.has(i) ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            {scenario.steps.map((step, i) => (
              <div key={i}>{renderStep(step, i)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
