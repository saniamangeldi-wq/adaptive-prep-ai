import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, PenLine, Headphones, Mic, Lock, History } from "lucide-react";
import { useIeltsAccess } from "@/hooks/useIeltsAccess";
import { IeltsTrialBanner } from "./IeltsTrialBanner";

export default function IeltsOverview() {
  const { trial, startTrial } = useIeltsAccess();

  return (
    <>
      <PageSeo
        title="IELTS practice | AdaptivePrep"
        description="IELTS Reading and Writing practice with instant marking and band-score feedback."
        path="/dashboard/ielts"
      />
      <DashboardLayout>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IELTS</h1>
            <p className="text-muted-foreground">
              Reading and Writing practice with instant marking and estimated band scores.
            </p>
          </div>

          <IeltsTrialBanner trial={trial} onStart={startTrial} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Reading</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Academic or General Training passages with the full range of official question types,
                marked instantly with explanations and an estimated band.
              </p>
              <Button asChild>
                <Link to="/dashboard/ielts/reading">Start reading practice</Link>
              </Button>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Writing</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Task 1 and Task 2 with a full examiner-style report: a band for each criterion,
                specific corrections and a model answer.
              </p>
              <Button asChild>
                <Link to="/dashboard/ielts/writing">Start writing practice</Link>
              </Button>
            </Card>

            <Card className="p-6 space-y-3 opacity-70">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Headphones className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Listening</h2>
                <Badge variant="secondary" className="ml-auto">
                  <Lock className="mr-1 h-3 w-3" /> Not available yet
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Audio-based practice is planned. Nothing here works yet, so nothing is shown.
              </p>
            </Card>

            <Card className="p-6 space-y-3 opacity-70">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Speaking</h2>
                <Badge variant="secondary" className="ml-auto">
                  <Lock className="mr-1 h-3 w-3" /> Not available yet
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Live speaking practice with a examiner-style interview is planned for a later release.
              </p>
            </Card>
          </div>

          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-foreground">Your past sessions and band reports</span>
            </div>
            <Button variant="outline" asChild>
              <Link to="/dashboard/ielts/history">View history</Link>
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}
