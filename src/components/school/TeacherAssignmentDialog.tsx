import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen } from "lucide-react";

const SUBJECTS = [
  "Math",
  "English",
  "Science",
  "History",
  "Geography",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Art",
  "Music",
  "Physical Education",
  "Foreign Language",
];

const GRADE_LEVELS = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

interface TeacherAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherName: string;
  initialSubjects?: string[];
  initialGradeLevels?: string[];
  onSave: (subjects: string[], gradeLevels: string[]) => void;
  mode: "approve" | "edit";
}

export function TeacherAssignmentDialog({
  open,
  onOpenChange,
  teacherName,
  initialSubjects = [],
  initialGradeLevels = [],
  onSave,
  mode,
}: TeacherAssignmentDialogProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjects);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(initialGradeLevels);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade)
        ? prev.filter((g) => g !== grade)
        : [...prev, grade]
    );
  };

  const handleSave = () => {
    onSave(selectedSubjects, selectedGrades);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {mode === "approve" ? "Approve Teacher" : "Edit Teacher Assignment"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Assign subjects and grade levels for <strong>{teacherName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Subjects */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <Label className="text-base font-medium">Subjects</Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBJECTS.map((subject) => (
                <div
                  key={subject}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedSubjects.includes(subject)
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSubject(subject)}
                >
                  <Checkbox
                    checked={selectedSubjects.includes(subject)}
                    onCheckedChange={() => toggleSubject(subject)}
                  />
                  <span className="text-sm">{subject}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grade Levels */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-primary" />
              <Label className="text-base font-medium">Grade Levels</Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GRADE_LEVELS.map((grade) => (
                <div
                  key={grade}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedGrades.includes(grade)
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  }`}
                  onClick={() => toggleGrade(grade)}
                >
                  <Checkbox
                    checked={selectedGrades.includes(grade)}
                    onCheckedChange={() => toggleGrade(grade)}
                  />
                  <span className="text-sm">{grade}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedSubjects.length === 0 || selectedGrades.length === 0}
          >
            {mode === "approve" ? "Approve & Assign" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
