import { School, GraduationCap } from "lucide-react";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentAffiliationBanner() {
  const { affiliation, loading } = useStudentAffiliation();

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!affiliation) {
    return null;
  }

  return (
    <div className={`p-4 rounded-xl border ${
      affiliation.type === "school" 
        ? "bg-gradient-to-r from-primary/10 to-teal-500/10 border-primary/30"
        : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30"
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          affiliation.type === "school"
            ? "bg-primary/20"
            : "bg-purple-500/20"
        }`}>
          {affiliation.type === "school" ? (
            <School className="w-6 h-6 text-primary" />
          ) : (
            <GraduationCap className="w-6 h-6 text-purple-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {affiliation.type === "school" ? "You're a student at" : "Your tutor"}
          </p>
          <h3 className="font-semibold text-foreground text-lg">
            {affiliation.name}
          </h3>
          {affiliation.type === "school" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              School Code: <span className="font-mono text-foreground">{affiliation.inviteCode.toUpperCase()}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
