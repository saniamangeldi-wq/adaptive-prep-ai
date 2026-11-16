import type { WritingTask } from "@ielts/contract.ts";
import { describeTask } from "@/lib/ielts/labels";
import { TaskVisuals } from "./TaskVisuals";

/** The task as the student sees it: wording, bullets, visuals. */
export function TaskCard({ task, customVisualNote }: { task: WritingTask; customVisualNote?: React.ReactNode }) {
  const bullets = Array.isArray(task.bullets) ? task.bullets : [];
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {describeTask(task.taskType, task.variant)} · at least {task.minWords} words · about {task.timeMinutes} minutes
      </p>
      <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed">{task.prompt}</p>
      {bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-foreground">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {customVisualNote}
      <TaskVisuals visuals={task.visuals} />
    </div>
  );
}
