import { cn } from "@/lib/utils";

const gradeLevels = [
  { value: "9", label: "9th Grade", icon: "🎒" },
  { value: "10", label: "10th Grade", icon: "📚" },
  { value: "11", label: "11th Grade", icon: "📖" },
  { value: "12", label: "12th Grade", icon: "🎓" },
  { value: "college", label: "College", icon: "🏛️" },
];

interface GradeLevelStepProps {
  value: string;
  onChange: (value: string) => void;
}

export function GradeLevelStep({ value, onChange }: GradeLevelStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          What grade are you in?
        </h2>
        <p className="text-muted-foreground mt-2">
          This helps us personalize your learning experience
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {gradeLevels.map((grade) => (
          <button
            key={grade.value}
            onClick={() => onChange(grade.value)}
            className={cn(
              "p-4 rounded-xl border-2 text-center transition-all duration-200",
              value === grade.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl block mb-2">{grade.icon}</span>
            <span className="text-foreground font-medium">{grade.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
