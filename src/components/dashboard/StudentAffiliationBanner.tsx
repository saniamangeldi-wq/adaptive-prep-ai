import { useState } from "react";
import { School, GraduationCap, BookOpen } from "lucide-react";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JoinCodeEntry } from "@/components/invite/JoinCodeEntry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function StudentAffiliationBanner() {
  const { affiliation, loading } = useStudentAffiliation();
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Show join school banner for non-affiliated students
  if (!affiliation) {
    return (
      <>
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Join Your School</h3>
              <p className="text-sm text-muted-foreground">
                Get access to assignments, grades, and school calendar by joining your school with an invite code.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowJoinDialog(true)}
              className="ml-auto shrink-0"
            >
              Join with Code
            </Button>
          </div>
        </div>

        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Join Your School</DialogTitle>
              <DialogDescription>
                Enter the invite code provided by your school administrator.
              </DialogDescription>
            </DialogHeader>
            <JoinCodeEntry />
          </DialogContent>
        </Dialog>
      </>
    );
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
