import { cn } from "@/lib/utils";

const goals = [
  { 
    value: "SAT", 
    label: "Prepare for SAT", 
    icon: "📝", 
    description: "Digital SAT practice tests and strategies" 
  },
  { 
    value: "ACT", 
    label: "Prepare for ACT", 
    icon: "📊", 
    description: "ACT test preparation and tips" 
  },
  { 
    value: "AP", 
    label: "Study for AP Exams", 
    icon: "🎓", 
    description: "Advanced Placement exam prep" 
  },
  { 
    value: "homework", 
    label: "Get Homework Help", 
    icon: "📚", 
    description: "Help with daily assignments" 
  },
  { 
    value: "general_learning", 
    label: "Improve Study Skills", 
    icon: "🧠", 
    description: "General learning and study techniques" 
  },
];

interface PrimaryGoalStepProps {
  value: string;
  onChange: (value: string) => void;
}

export function PrimaryGoalStep({ value, onChange }: PrimaryGoalStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          What's your main goal?
        </h2>
        <p className="text-muted-foreground mt-2">
          We'll prioritize content based on your primary focus
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onChange(goal.value)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4",
              value === goal.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{goal.icon}</span>
            <div>
              <span className="text-foreground font-medium block">{goal.label}</span>
              <span className="text-sm text-muted-foreground">{goal.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
