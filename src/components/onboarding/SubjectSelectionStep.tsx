import { cn } from "@/lib/utils";

const subjects = [
  { name: "SAT", category: "test_prep", icon: "📝", description: "Digital SAT preparation" },
  { name: "ACT", category: "test_prep", icon: "📊", description: "ACT test preparation" },
  { name: "AP Calculus", category: "test_prep", icon: "📐", description: "Advanced Placement Calculus" },
  { name: "AP English", category: "test_prep", icon: "📖", description: "Advanced Placement English" },
  { name: "Math", category: "high_school", icon: "🔢", description: "Algebra, Geometry, Pre-Calculus" },
  { name: "Science", category: "high_school", icon: "🧪", description: "Biology, Chemistry, Physics" },
  { name: "English", category: "high_school", icon: "📚", description: "Grammar, Writing, Literature" },
  { name: "History", category: "high_school", icon: "🏛️", description: "US History, World History" },
  { name: "Essay Writing", category: "general", icon: "✍️", description: "College essays, creative writing" },
  { name: "Homework Help", category: "general", icon: "📝", description: "Any subject homework assistance" },
];

interface SubjectSelectionStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function SubjectSelectionStep({ value, onChange }: SubjectSelectionStepProps) {
  const toggleSubject = (subjectName: string) => {
    if (value.includes(subjectName)) {
      onChange(value.filter((s) => s !== subjectName));
    } else {
      onChange([...value, subjectName]);
    }
  };

  const categoryLabels: Record<string, string> = {
    test_prep: "Test Preparation",
    high_school: "High School Subjects",
    general: "General Learning",
  };

  const groupedSubjects = subjects.reduce((acc, subject) => {
    if (!acc[subject.category]) {
      acc[subject.category] = [];
    }
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, typeof subjects>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          What subjects do you need help with?
        </h2>
        <p className="text-muted-foreground mt-2">
          Select all that apply - you can change these later
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSubjects).map(([category, categorySubjects]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {categoryLabels[category]}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categorySubjects.map((subject) => (
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
        ))}
      </div>

      {value.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {value.length} subject{value.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
