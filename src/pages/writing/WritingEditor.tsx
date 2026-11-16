import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ImagePlus, Loader2 } from "lucide-react";
import {
  CREDIT_COST,
  LIMITS,
  type CustomVisualInput,
  type FeedbackLang,
  type WritingTask,
} from "@ielts/contract.ts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { TaskCard } from "@/components/writing/TaskCard";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describeApiError, getDraft, gradeWriting, saveDraft, toApiError } from "@/lib/ielts/api";
import { buildGradeRequest } from "@/lib/ielts/requestBuilders";
import { chooseDraft, clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/ielts/drafts";
import { deleteCustomVisual, loadCustomVisual, saveCustomVisual } from "@/lib/ielts/deviceStore";
import { compressImageToJpeg } from "@/lib/ielts/image";
import { FEEDBACK_LANGUAGES, describeTask, formatDuration } from "@/lib/ielts/labels";
import { countWords } from "@/lib/ielts/words";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "missing" | "failed";
type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "offline" };

const SERVER_SAVE_INTERVAL_MS = 5000;
const LOCAL_SAVE_DEBOUNCE_MS = 400;

function clock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * One editor instance per draft: a new session id remounts the editor, so no timer or
 * save from one draft can ever write into another.
 */
export default function WritingEditorRoute() {
  const { sessionId = "" } = useParams();
  return <WritingEditor key={sessionId} sessionId={sessionId} />;
}

function WritingEditor({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [task, setTask] = useState<WritingTask | null>(null);
  const [script, setScript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [lang, setLang] = useState<FeedbackLang>("en");
  const [langTouched, setLangTouched] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  // False when the browser refused to store the device copy (storage full or blocked).
  const [localOk, setLocalOk] = useState(true);
  const [showTask, setShowTask] = useState(true);
  const [includeModelAnswer, setIncludeModelAnswer] = useState(false);
  const [customVisual, setCustomVisual] = useState<CustomVisualInput | null>(null);

  const [grading, setGrading] = useState(false);
  const [gradingSeconds, setGradingSeconds] = useState(0);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Missing chart dialog
  const [missingVisualOpen, setMissingVisualOpen] = useState(false);
  const [fixDescription, setFixDescription] = useState("");
  const [fixBusy, setFixBusy] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const fixFileRef = useRef<HTMLInputElement>(null);

  // Refs so timers and event handlers always see the latest values.
  const scriptRef = useRef(script);
  const secondsRef = useRef(seconds);
  const langRef = useRef(lang);
  const taskRef = useRef<WritingTask | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  // Set once the answer has been graded, so the cleanup below does not recreate the device draft.
  const submittedRef = useRef(false);
  // updatedAt of the newest server copy we know about; stored with the device copy (see chooseDraft).
  const serverSyncRef = useRef<string | null>(null);
  scriptRef.current = script;
  secondsRef.current = seconds;
  langRef.current = lang;
  taskRef.current = task;

  // ───────── Load: restore the newer of the device copy and the server copy ─────────
  const load = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    const local = readLocalDraft(sessionId);
    let server = null;
    let serverFailed: unknown = null;
    try {
      server = await getDraft(sessionId);
    } catch (e) {
      const err = toApiError(e);
      // A malformed or unknown id is a missing draft, not a connection problem.
      if (err.code !== "bad_request" && err.code !== "not_found") serverFailed = err;
    }
    const chosen = chooseDraft(local, server);
    if (!chosen) {
      if (serverFailed) {
        setLoadError(describeApiError(serverFailed, "draft"));
        setLoadState("failed");
      } else {
        setLoadState("missing");
      }
      return;
    }
    serverSyncRef.current = server?.updatedAt ?? local?.serverUpdatedAt ?? null;
    setTask(chosen.task);
    setScript(chosen.script);
    setSeconds(chosen.secondsUsed);
    if (local?.feedbackLang) {
      setLang(local.feedbackLang);
      setLangTouched(true);
    }
    dirtyRef.current = chosen.serverIsStale;
    setStatus(serverFailed ? { kind: "offline" } : chosen.serverIsStale ? { kind: "idle" } : { kind: "saved", at: new Date(chosen.updatedAt) });
    setLoadState("ready");
    if (chosen.task.source === "custom") loadCustomVisual(sessionId).then(setCustomVisual);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Default feedback language from the profile, until the student picks one.
  useEffect(() => {
    if (langTouched) return;
    const pref = profile?.preferred_language;
    if (pref === "en" || pref === "ru" || pref === "kk") setLang(pref);
  }, [profile?.preferred_language, langTouched]);

  // ───────── Autosave to this device (debounced) ─────────
  const writeLocalNow = useCallback(() => {
    const t = taskRef.current;
    if (!t || !sessionId || submittedRef.current) return;
    const ok = writeLocalDraft(sessionId, {
      task: t,
      script: scriptRef.current,
      secondsUsed: secondsRef.current,
      updatedAt: new Date().toISOString(),
      feedbackLang: langRef.current,
      ...(serverSyncRef.current ? { serverUpdatedAt: serverSyncRef.current } : {}),
    });
    setLocalOk(ok);
  }, [sessionId]);

  useEffect(() => {
    if (loadState !== "ready") return;
    const id = setTimeout(writeLocalNow, LOCAL_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [script, lang, loadState, writeLocalNow]);

  // ───────── Autosave to the server ─────────
  const saveToServer = useCallback(async () => {
    const t = taskRef.current;
    if (!t || !sessionId || savingRef.current || !dirtyRef.current) return;
    savingRef.current = true;
    const snapshot = scriptRef.current;
    dirtyRef.current = false;
    setStatus({ kind: "saving" });
    try {
      const res = await saveDraft({ sessionId, task: t, script: snapshot, secondsUsed: secondsRef.current });
      if (scriptRef.current !== snapshot) dirtyRef.current = true;
      serverSyncRef.current = res.updatedAt;
      writeLocalNow();
      setStatus({ kind: "saved", at: new Date(res.updatedAt) });
    } catch (e) {
      dirtyRef.current = true;
      setStatus({ kind: "offline" });
      // A draft that no longer exists on the server will keep failing; the device copy stays safe.
      void toApiError(e);
    } finally {
      savingRef.current = false;
    }
  }, [sessionId, writeLocalNow]);

  const handleChange = (value: string) => {
    setScript(value);
    dirtyRef.current = true;
    if (status.kind === "saved") setStatus({ kind: "idle" });
  };

  useEffect(() => {
    if (loadState !== "ready") return;
    const id = setInterval(saveToServer, SERVER_SAVE_INTERVAL_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        writeLocalNow();
        saveToServer();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      writeLocalNow();
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", writeLocalNow);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", writeLocalNow);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Leaving the editor inside the app (Back, menu): keep the device copy and push the
      // latest text to the server so the drafts list and other devices see it.
      writeLocalNow();
      void saveToServer();
    };
  }, [loadState, saveToServer, writeLocalNow]);

  // ───────── Timer: counts up while the page is visible; never submits ─────────
  useEffect(() => {
    if (loadState !== "ready" || grading) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [loadState, grading]);

  useEffect(() => {
    if (!grading) return;
    setGradingSeconds(0);
    const id = setInterval(() => setGradingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [grading]);

  // ───────── Submit ─────────
  const words = useMemo(() => countWords(script), [script]);
  const chars = script.trim().length;
  const overLimit = words > LIMITS.maxScriptWords;
  const tooShortToGrade = chars < LIMITS.minScriptChars;
  const needsChart = task?.source === "custom" && task.taskType === "task1_academic";

  const doGrade = async (visual?: CustomVisualInput | null) => {
    if (!task) return;
    setGrading(true);
    setGradeError(null);
    try {
      const { report } = await gradeWriting(
        buildGradeRequest({ task, script, feedbackLang: lang, sessionId, visual, includeModelAnswer }),
      );
      submittedRef.current = true;
      dirtyRef.current = false;
      if (report.id) {
        clearLocalDraft(sessionId);
        void deleteCustomVisual(sessionId);
      }
      // Without an id the report could not be stored, so the server keeps the draft open;
      // the device copy stays too, and the student can submit it again from Drafts.
      if (report.id) navigate(`/dashboard/writing/report/${report.id}`, { replace: true });
      else navigate("/dashboard/writing/report/unsaved", { replace: true, state: { report } });
    } catch (e) {
      setGradeError(describeApiError(e, "grade"));
      setGrading(false);
    }
  };

  const handleSubmit = async () => {
    if (!task || grading || tooShortToGrade || overLimit) return;
    writeLocalNow();
    if (needsChart) {
      const stored = customVisual ?? (await loadCustomVisual(sessionId));
      if (!stored || (!stored.imageDataUrl && !stored.description?.trim())) {
        setFixError(null);
        setMissingVisualOpen(true);
        return;
      }
      await doGrade(stored);
      return;
    }
    await doGrade(null);
  };

  const applyFixedVisual = async (visual: CustomVisualInput) => {
    await saveCustomVisual(sessionId, visual);
    setCustomVisual(visual);
    setMissingVisualOpen(false);
    await doGrade(visual);
  };

  const handleFixFile = async (file: File | undefined) => {
    if (!file) return;
    setFixBusy(true);
    setFixError(null);
    try {
      const dataUrl = await compressImageToJpeg(file, LIMITS.maxImageBytes);
      await applyFixedVisual({ imageDataUrl: dataUrl });
    } catch (e) {
      setFixError(e instanceof Error ? e.message : "That image could not be used.");
    } finally {
      setFixBusy(false);
      if (fixFileRef.current) fixFileRef.current.value = "";
    }
  };

  // ───────── Render ─────────
  const seo = (
    <PageSeo title="Write | AdaptivePrep" description="Write your IELTS Writing answer and get an estimated band." path="/dashboard/writing" />
  );

  if (loadState === "loading") {
    return (
      <DashboardLayout>
        {seo}
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your draft...</div>
      </DashboardLayout>
    );
  }

  if (loadState !== "ready" || !task) {
    return (
      <DashboardLayout>
        {seo}
        <div className="max-w-xl space-y-3">
          <h1 className="text-2xl font-bold text-foreground">{loadState === "missing" ? "We could not find this draft" : "We could not open this draft"}</h1>
          <p className="text-muted-foreground">
            {loadState === "missing"
              ? "It may have been submitted or discarded."
              : loadError ?? "Something went wrong."}
          </p>
          <div className="flex gap-2">
            {loadState === "failed" && <Button variant="outline" onClick={load}>Try again</Button>}
            <Button asChild><Link to="/dashboard/writing">Back to Writing</Link></Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const belowMin = words < task.minWords;
  const recommendedSeconds = task.timeMinutes * 60;
  const overTime = seconds > recommendedSeconds;

  const statusText =
    status.kind === "saving"
      ? "Saving…"
      : status.kind === "saved"
        ? `Saved ${clock(status.at)}`
        : !localOk
          ? status.kind === "offline"
            ? "Not saved. Copy your text somewhere safe."
            : "Not saved on this device yet"
          : status.kind === "offline"
            ? "Offline, saved on this device"
            : "Saved on this device";

  return (
    <DashboardLayout>
      {seo}
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{describeTask(task.taskType, task.variant)}</h1>
          </div>
          <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
            <Link to="/dashboard/writing">Back</Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start">
          {/* Task */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto" aria-label="The task">
            <button
              type="button"
              onClick={() => setShowTask((v) => !v)}
              aria-expanded={showTask}
              className="flex w-full items-center justify-between text-sm font-semibold text-foreground lg:pointer-events-none"
            >
              <span>The task</span>
              <span className="lg:hidden text-muted-foreground inline-flex items-center gap-1 text-xs font-normal">
                {showTask ? <>Hide <ChevronUp className="h-4 w-4" /></> : <>Show <ChevronDown className="h-4 w-4" /></>}
              </span>
            </button>
            <div className={cn("mt-3", !showTask && "hidden lg:block")}>
              <TaskCard
                task={task}
                customVisualNote={
                  needsChart ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Your chart (kept on this device only)</p>
                      {customVisual?.imageDataUrl ? (
                        <img src={customVisual.imageDataUrl} alt="The chart you added for this question" className="max-h-72 w-auto max-w-full rounded-md bg-white object-contain" />
                      ) : customVisual?.description ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{customVisual.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not found on this device. You will be asked to add it again when you submit.</p>
                      )}
                    </div>
                  ) : null
                }
              />
            </div>
          </section>

          {/* Editor */}
          <section className="space-y-3 min-w-0" aria-label="Your answer">
            <div className="sticky top-14 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:static">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span aria-live="polite" className={cn("font-medium tabular-nums", belowMin ? "text-warning" : "text-primary")}>
                  {words} / {task.minWords} words
                </span>
                <span className={cn("tabular-nums", overTime ? "text-warning" : "text-muted-foreground")}>
                  {formatDuration(seconds)} of {formatDuration(recommendedSeconds)}
                </span>
                <span className={cn("text-xs ml-auto", localOk ? "text-muted-foreground" : "text-destructive")} role="status">{statusText}</span>
              </div>
            </div>

            <Label htmlFor="script" className="sr-only">Your answer</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => { writeLocalNow(); saveToServer(); }}
              disabled={grading}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="sentences"
              placeholder="Write your answer here."
              className="min-h-[18rem] lg:min-h-[30rem] text-base leading-[1.75] resize-y font-script"
            />

            {belowMin && words > 0 && (
              <p className="text-xs text-muted-foreground">
                Below the minimum of {task.minWords} words. You can still submit, but a short answer usually lowers the estimate.
              </p>
            )}
            {overLimit && (
              <p role="alert" className="text-sm text-destructive">
                Over {LIMITS.maxScriptWords} words. Shorten your answer to submit it.
              </p>
            )}

            <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-lang">Feedback language</Label>
                  <Select value={lang} onValueChange={(v) => { setLang(v as FeedbackLang); setLangTouched(true); }}>
                    <SelectTrigger id="feedback-lang"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="model-answer" checked={includeModelAnswer} onCheckedChange={(c) => setIncludeModelAnswer(c === true)} className="mt-0.5" />
                  <Label htmlFor="model-answer" className="text-sm font-normal leading-snug">
                    Include a model answer
                    <span className="block text-xs text-muted-foreground">Uses {CREDIT_COST.gradeWithModelAnswer} credits instead of {CREDIT_COST.grade}.</span>
                  </Label>
                </div>
              </div>

              {gradeError && (
                <p role="alert" className="text-sm text-destructive">{gradeError}</p>
              )}

              <Button variant="hero" size="lg" className="w-full" onClick={handleSubmit} disabled={grading || tooShortToGrade || overLimit}>
                {grading ? <><Loader2 className="h-4 w-4 animate-spin" /> Grading...</> : "Get my estimated band"}
              </Button>
              {tooShortToGrade && !grading && (
                <p className="text-xs text-muted-foreground">Write a little more before submitting.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Waiting state */}
      {grading && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" role="alertdialog" aria-live="assertive" aria-label="Grading your answer">
          <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="font-semibold text-foreground">Grading your answer</p>
            <p className="text-sm text-muted-foreground">
              This can take up to about a minute. Keep this page open. Your text is saved.
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatDuration(gradingSeconds)} so far</p>
          </div>
        </div>
      )}

      {/* Chart missing from this device */}
      <Dialog open={missingVisualOpen} onOpenChange={setMissingVisualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your chart is not on this device</DialogTitle>
            <DialogDescription>
              Charts you add are kept on the device you started on, not on our servers. Add it again, describe it in words, or continue without it. Without it we cannot check your description against the data, and the estimate will be less reliable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input ref={fixFileRef} type="file" accept="image/*" className="sr-only" id="fix-file" onChange={(e) => handleFixFile(e.target.files?.[0])} />
            <Button type="button" variant="outline" className="w-full" disabled={fixBusy} onClick={() => fixFileRef.current?.click()}>
              {fixBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing image...</> : <><ImagePlus className="h-4 w-4" /> Add the image again</>}
            </Button>
            <div className="space-y-2">
              <Label htmlFor="fix-desc">Or describe it in words</Label>
              <Textarea id="fix-desc" rows={4} value={fixDescription} onChange={(e) => setFixDescription(e.target.value.slice(0, LIMITS.maxVisualDescriptionChars))} placeholder="Say what kind of chart it is and list the key figures." />
              <Button type="button" variant="outline" className="w-full" disabled={!fixDescription.trim()} onClick={() => applyFixedVisual({ description: fixDescription.trim() })}>
                Use this description
              </Button>
            </div>
            {fixError && <p role="alert" className="text-sm text-destructive">{fixError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setMissingVisualOpen(false); void doGrade(null); }}>Continue without it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
