import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChartWidget, type ChartWidgetData } from "@/components/ai/ChartWidget";
import {
  countWords,
  type IeltsChart,
  type IeltsWritingReport,
  type IeltsWritingTask,
  type IeltsWritingTaskData,
} from "@/lib/ielts";
import { IeltsBandReport } from "./IeltsBandReport";

const TASK_LABELS: Record<IeltsWritingTask, string> = {
  task1_academic: "Task 1 — Academic",
  task1_general: "Task 1 — General letter",
  task2: "Task 2 — Essay",
};

function toChartWidget(chart: IeltsChart): ChartWidgetData {
  const categoryKey = chart.categoryKey ?? "label";
  const rows = (chart.data ?? []).map((row) => {
    const { [categoryKey]: label, ...rest } = row;
    return { name: String(label ?? ""), ...rest };
  });
  return {
    widget_type: "chart_visual",
    chart_type: (chart.kind ?? "bar") as ChartWidgetData["chart_type"],
    title: chart.title,
    unit: chart.unit,
    data: rows,
  };
}

export default function IeltsWriting() {
  const [taskType, setTaskType] = useState<IeltsWritingTask>("task2");
  const [topic, setTopic] = useState("");
  const [task, setTask] = useState<IeltsWritingTaskData | null>(null);
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [report, setReport] = useState<IeltsWritingReport | null>(null);

  const words = useMemo(() => countWords(essay), [essay]);
  const minWords = task?.minWords ?? (taskType === "task2" ? 250 : 150);

  const generate = async () => {
    setLoading(true);
    setReport(null);
    setEssay("");
    setTask(null);
    try {
      const { data, error } = await supabase.functions.invoke("ielts-generate-writing-task", {
        body: { taskType, topic },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTask(data as IeltsWritingTaskData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the task.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!task) return;
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ielts-grade-writing", {
        body: {
          taskType: task.taskType,
          prompt: task.prompt,
          chart: task.chart,
          essay,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data as IeltsWritingReport);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark this answer.");
    } finally {
      setGrading(false);
    }
  };

  return (
    <>
      <PageSeo
        title="IELTS Writing practice | AdaptivePrep"
        description="Practise IELTS Writing Task 1 and Task 2 and get a band score for every marking criterion."
        path="/dashboard/ielts/writing"
      />
      <DashboardLayout>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IELTS Writing</h1>
            <p className="text-muted-foreground">
              A full examiner-style report on every answer you submit.
            </p>
          </div>

          {report && <IeltsBandReport report={report} />}

          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Task</Label>
              <Tabs value={taskType} onValueChange={(v) => setTaskType(v as IeltsWritingTask)}>
                <TabsList className="w-full">
                  {(Object.keys(TASK_LABELS) as IeltsWritingTask[]).map((key) => (
                    <TabsTrigger key={key} value={key} className="flex-1 text-xs sm:text-sm">
                      {TASK_LABELS[key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ielts-writing-topic">Subject area (optional)</Label>
              <Input
                id="ielts-writing-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. education, city transport"
                maxLength={120}
              />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {task ? <><RotateCcw className="mr-2 h-4 w-4" /> New task</> : "Get a task"}
            </Button>
          </Card>

          {task && (
            <Card className="space-y-4 p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {TASK_LABELS[task.taskType]} · {task.timeMinutes} minutes · at least {minWords} words
                </p>
                <p className="whitespace-pre-line text-foreground">{task.prompt}</p>
                {task.bullets.length > 0 && (
                  <ul className="ml-5 list-disc space-y-1 text-foreground">
                    {task.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>

              {task.chart && <ChartWidget data={toChartWidget(task.chart)} />}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ielts-essay">Your answer</Label>
                  <span
                    className={
                      words >= minWords ? "text-sm text-primary" : "text-sm text-muted-foreground"
                    }
                  >
                    {words} / {minWords} words
                  </span>
                </div>
                <Textarea
                  id="ielts-essay"
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  rows={16}
                  placeholder="Write your answer here..."
                />
              </div>

              <Button onClick={submit} disabled={grading || words < 40} size="lg">
                {grading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit for marking
              </Button>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
