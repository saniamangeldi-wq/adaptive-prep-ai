import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  LIMITS,
  TASK_RULES,
  VARIANTS_BY_TASK,
  type CustomVisualInput,
  type DraftRecord,
  type TaskType,
  type TaskVariant,
  type WritingTask,
} from "@ielts/contract.ts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { describeApiError, discardDraft, getWritingTask, listDrafts, saveDraft } from "@/lib/ielts/api";
import { readSeenTaskIds, rememberSeenTaskId, writeLocalDraft } from "@/lib/ielts/drafts";
import { saveCustomVisual } from "@/lib/ielts/deviceStore";
import { compressImageToJpeg } from "@/lib/ielts/image";
import { TASK_TYPE_HINTS, TASK_TYPE_LABELS, VARIANT_LABELS, describeTask, formatDuration } from "@/lib/ielts/labels";
import { countWords } from "@/lib/ielts/words";
import { cn } from "@/lib/utils";

const TASK_TYPES: TaskType[] = ["task1_academic", "task1_general", "task2"];
const MIN_OWN_PROMPT_CHARS = 20;
const MAX_DESCRIPTION_CHARS = 2000;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function WritingHome() {
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState<TaskType>("task2");
  const [variant, setVariant] = useState<TaskVariant | "any">("any");
  const [mode, setMode] = useState<"bank" | "own">("bank");

  // "Use my own question" fields
  const [ownPrompt, setOwnPrompt] = useState("");
  const [visualMode, setVisualMode] = useState<"image" | "text">("image");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [discardTarget, setDiscardTarget] = useState<DraftRecord | null>(null);

  const loadDrafts = useCallback(async () => {
    setDraftsError(null);
    try {
      const list = await listDrafts();
      setDrafts([...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
    } catch (e) {
      setDrafts([]);
      setDraftsError(describeApiError(e, "draft"));
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const changeTaskType = (t: TaskType) => {
    setTaskType(t);
    setVariant(mode === "own" ? VARIANTS_BY_TASK[t][0] : "any");
    setError(null);
  };

  const changeMode = (m: "bank" | "own") => {
    setMode(m);
    setError(null);
    if (m === "own" && variant === "any") setVariant(VARIANTS_BY_TASK[taskType][0]);
    if (m === "bank" && variant !== "any") setVariant("any");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImageBusy(true);
    setError(null);
    try {
      const dataUrl = await compressImageToJpeg(file, LIMITS.maxImageBytes);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch (e) {
      setImageDataUrl(null);
      setImageName("");
      setError(e instanceof Error ? e.message : "That image could not be used.");
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startWithTask = async (task: WritingTask, visual?: CustomVisualInput) => {
    const saved = await saveDraft({ task, script: "", secondsUsed: 0 });
    // Keep a device copy straight away so the editor opens even if the server is slow.
    writeLocalDraft(saved.sessionId, { task, script: "", secondsUsed: 0, updatedAt: saved.updatedAt });
    if (visual) await saveCustomVisual(saved.sessionId, visual);
    navigate(`/dashboard/writing/session/${saved.sessionId}`);
  };

  const handleGetTask = async () => {
    setStarting(true);
    setError(null);
    try {
      const { task } = await getWritingTask({
        taskType,
        variant: variant === "any" ? undefined : variant,
        source: "bank",
        excludeIds: readSeenTaskIds(),
      });
      rememberSeenTaskId(task.id);
      await startWithTask(task);
    } catch (e) {
      setError(describeApiError(e, "task"));
      setStarting(false);
    }
  };

  const ownNeedsVisual = taskType === "task1_academic";
  const trimmedPrompt = ownPrompt.trim();
  const hasVisual = visualMode === "image" ? !!imageDataUrl : description.trim().length > 0;
  const ownProblem =
    trimmedPrompt.length < MIN_OWN_PROMPT_CHARS
      ? "Paste the full question."
      : trimmedPrompt.length > LIMITS.maxPromptChars
        ? `The question is too long (the limit is ${LIMITS.maxPromptChars} characters).`
        : variant === "any"
          ? "Choose the type of question."
          : ownNeedsVisual && !hasVisual
            ? visualMode === "image"
              ? "Add a photo or screenshot of the chart, or describe it in words."
              : "Describe the chart or diagram in words, or add an image instead."
            : null;

  const handleStartOwn = async () => {
    if (ownProblem || variant === "any") return;
    setStarting(true);
    setError(null);
    const rules = TASK_RULES[taskType];
    const task: WritingTask = {
      id: "custom",
      source: "custom",
      taskType,
      variant,
      prompt: trimmedPrompt,
      bullets: [],
      visuals: [],
      minWords: rules.minWords,
      timeMinutes: rules.timeMinutes,
    };
    const visual: CustomVisualInput | undefined = ownNeedsVisual
      ? visualMode === "image"
        ? { imageDataUrl: imageDataUrl ?? undefined }
        : { description: description.trim() }
      : undefined;
    try {
      await startWithTask(task, visual);
    } catch (e) {
      setError(describeApiError(e, "draft"));
      setStarting(false);
    }
  };

  const confirmDiscard = async () => {
    const target = discardTarget;
    setDiscardTarget(null);
    if (!target) return;
    try {
      await discardDraft(target.sessionId);
      setDrafts((prev) => (prev ? prev.filter((d) => d.sessionId !== target.sessionId) : prev));
      toast.success("Draft discarded");
    } catch (e) {
      toast.error(describeApiError(e, "draft"));
    }
  };

  const variantOptions = VARIANTS_BY_TASK[taskType];

  return (
    <DashboardLayout>
      <PageSeo
        title="Writing | AdaptivePrep"
        description="Choose an IELTS Writing task and get an estimated band with feedback on your own sentences."
        path="/dashboard/writing"
      />
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Writing</h1>
          <p className="text-muted-foreground mt-1">Pick a task, write your answer, and get an estimated band on the four criteria.</p>
        </div>

        <section className="space-y-3" aria-labelledby="task-type-heading">
          <h2 id="task-type-heading" className="font-semibold text-foreground">1. Task type</h2>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-labelledby="task-type-heading">
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={taskType === t}
                onClick={() => changeTaskType(t)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors min-h-[4.5rem]",
                  taskType === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
              >
                <span className="block text-sm font-semibold text-foreground">{TASK_TYPE_LABELS[t]}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{TASK_TYPE_HINTS[t]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">2. Question type</h2>
          <div className="max-w-sm">
            <Label htmlFor="variant" className="sr-only">Question type</Label>
            <Select value={variant} onValueChange={(v) => setVariant(v as TaskVariant | "any")}>
              <SelectTrigger id="variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mode === "bank" && <SelectItem value="any">Any</SelectItem>}
                {variantOptions.map((v) => (
                  <SelectItem key={v} value={v}>{VARIANT_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">3. Start</h2>
          <Tabs value={mode} onValueChange={(v) => changeMode(v as "bank" | "own")}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
              <TabsTrigger value="bank">Give me a task</TabsTrigger>
              <TabsTrigger value="own">Use my own question</TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">We pick a question for you from our own set. It is free.</p>
              <Button variant="hero" onClick={handleGetTask} disabled={starting} className="w-full sm:w-auto">
                {starting ? <><Loader2 className="h-4 w-4 animate-spin" /> Getting your task...</> : "Give me a task"}
              </Button>
            </TabsContent>

            <TabsContent value="own" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="own-prompt">Paste the full question</Label>
                <Textarea
                  id="own-prompt"
                  value={ownPrompt}
                  onChange={(e) => setOwnPrompt(e.target.value)}
                  rows={6}
                  placeholder="Paste the question exactly as you were given it, including any bullet points."
                />
                <p className="text-xs text-muted-foreground">{countWords(ownPrompt)} words</p>
              </div>

              {ownNeedsVisual && (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">The chart or diagram</p>
                  <div className="flex gap-2" role="group" aria-label="How to give the chart">
                    <Button type="button" size="sm" variant={visualMode === "image" ? "default" : "outline"} aria-pressed={visualMode === "image"} onClick={() => setVisualMode("image")}>
                      Add a photo
                    </Button>
                    <Button type="button" size="sm" variant={visualMode === "text" ? "default" : "outline"} aria-pressed={visualMode === "text"} onClick={() => setVisualMode("text")}>
                      Describe it in words
                    </Button>
                  </div>

                  {visualMode === "image" ? (
                    <div className="space-y-2">
                      <input
                        ref={fileRef}
                        id="chart-file"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      {imageDataUrl ? (
                        <div className="flex items-start gap-3">
                          <img src={imageDataUrl} alt="The chart you added" className="h-28 w-auto max-w-[60%] rounded-md border border-border object-contain bg-white" />
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs text-muted-foreground truncate">{imageName}</p>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setImageDataUrl(null); setImageName(""); }}>
                              <X className="h-4 w-4" /> Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={imageBusy}>
                          {imageBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing image...</> : <><ImagePlus className="h-4 w-4" /> Choose a photo or screenshot</>}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        The image is shrunk on your device. It is sent only when you submit for grading, and it is not kept on our servers.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="chart-desc" className="sr-only">Describe the chart</Label>
                      <Textarea
                        id="chart-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_CHARS))}
                        rows={5}
                        placeholder="Say what kind of chart it is, what the axes and labels are, and list the key figures."
                      />
                    </div>
                  )}
                </div>
              )}

              {ownProblem && trimmedPrompt.length > 0 && <p className="text-sm text-muted-foreground">{ownProblem}</p>}
              <Button variant="hero" onClick={handleStartOwn} disabled={starting || !!ownProblem || imageBusy} className="w-full sm:w-auto">
                {starting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : "Start writing"}
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="drafts-heading">
          <h2 id="drafts-heading" className="font-semibold text-foreground">Drafts in progress</h2>
          {drafts === null ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : draftsError ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">{draftsError}</p>
              <Button size="sm" variant="outline" onClick={loadDrafts}>Try again</Button>
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts yet. When you start a task, it is saved here until you submit it.</p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((d) => {
                const words = countWords(d.script);
                return (
                  <li key={d.sessionId} className="rounded-xl border border-border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{describeTask(d.task?.taskType, d.task?.variant)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {words > 0 ? `${words} words` : "Not started"} · {formatDuration(d.secondsUsed)} · saved {formatWhen(d.updatedAt)}
                      </p>
                      {d.script.trim() && <p className="text-xs text-muted-foreground truncate mt-1">{d.script.trim().slice(0, 100)}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/dashboard/writing/session/${d.sessionId}`}>Resume</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDiscardTarget(d)}>Discard</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog open={!!discardTarget} onOpenChange={(open) => !open && setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>The text you wrote will be deleted. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
