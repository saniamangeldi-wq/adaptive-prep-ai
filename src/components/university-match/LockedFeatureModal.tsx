import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, School } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LockedFeatureModal({ open, onOpenChange }: LockedFeatureModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center text-xl">
            School Exclusive Feature
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p>
              The University Match feature is only available to students registered through a school.
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <School className="w-5 h-5" />
              <span className="font-medium">Join through your school to unlock</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask your school administrator about joining AdaptivePrep to access personalized university recommendations based on your portfolio and preferences.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={() => navigate("/dashboard")} variant="default">
            Return to Dashboard
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
