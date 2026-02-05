import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, School, Crown } from "lucide-react";
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
            Premium Feature
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p>
              The University Match feature is available to:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Crown className="w-5 h-5 text-warning" />
                <span className="font-medium">Elite subscribers ($21/mo)</span>
              </div>
              <div className="text-muted-foreground text-sm">or</div>
              <div className="flex items-center justify-center gap-2 text-primary">
                <School className="w-5 h-5" />
                <span className="font-medium">School-registered students</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrade to Elite or ask your school administrator about joining AdaptivePrep to access personalized university recommendations.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={() => navigate("/dashboard/billing")} variant="hero">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Elite
          </Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
