import { cn } from "@/lib/utils";

const subjects = [
  { name: "SAT", category: "primary", icon: "📝", description: "Full practice tests & targeted prep" },
  { name: "Math", category: "ai_help", icon: "🔢", description: "AI tutoring for Algebra, Geometry & more" },
  { name: "Science", category: "ai_help", icon: "🧪", description: "AI tutoring for Bio, Chem, Physics" },
  { name: "English", category: "ai_help", icon: "📚", description: "AI tutoring for Grammar & Literature" },
  { name: "History", category: "ai_help", icon: "🏛️", description: "AI tutoring for US & World History" },
  { name: "Essay Writing", category: "ai_help", icon: "✍️", description: "AI help with college & creative essays" },
];

interface SubjectSelectionStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function SubjectSelectionStep({ value, onChange }: SubjectSelectionStepProps) {
  const toggleSubject = (subjectName: string) => {
    // SAT is always selected and can't be removed
    if (subjectName === "SAT") return;
    if (value.includes(subjectName)) {
      onChange(value.filter((s) => s !== subjectName));
    } else {
      onChange([...value, subjectName]);
    }
  };

  const primarySubjects = subjects.filter((s) => s.category === "primary");
  const aiSubjects = subjects.filter((s) => s.category === "ai_help");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          What would you like help with?
        </h2>
        <p className="text-muted-foreground mt-2">
          SAT is your core focus — select any other subjects for AI tutoring
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary - SAT */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Core Focus
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {primarySubjects.map((subject) => (
              <div
                key={subject.name}
                className="p-4 rounded-xl border-2 border-primary bg-primary/10 flex items-center gap-4"
              >
                <span className="text-3xl">{subject.icon}</span>
                <div className="flex-1">
                  <span className="text-foreground font-semibold block">{subject.name}</span>
                  <span className="text-sm text-muted-foreground">{subject.description}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                  Always included
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Tutoring Subjects */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            AI Tutoring (Optional)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {aiSubjects.map((subject) => (
              <button
                key={subject.name}
                onClick={() => toggleSubject(subject.name)}
                className={cn(
                  "p-3 rounded-xl border-2 text-center transition-all duration-200",
                  value.includes(subject.name)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl block mb-1">{subject.icon}</span>
                <span className="text-foreground text-sm font-medium">{subject.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {value.length > 1 && (
        <p className="text-center text-sm text-muted-foreground">
          {value.length} subjects selected
        </p>
      )}
    </div>
  );
}
