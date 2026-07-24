import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconPicker } from "./IconPicker";
import { SpaceReferencesEditor } from "./SpaceReferencesEditor";
import type { Reference } from "@/hooks/useReferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, ChevronRight, Loader2, ArrowLeft } from "lucide-react";

interface CreateSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSpace: (
    name: string,
    description: string,
    icon: string,
    instructions: string,
    references: Reference[]
  ) => void;
}

type Phase = "basic" | "guided" | "freetext" | "draft";

const QUESTION_KEYS: { q: string; p: string }[] = [
  { q: "spaces.q1", p: "spaces.q1p" },
  { q: "spaces.q2", p: "spaces.q2p" },
  { q: "spaces.q3", p: "spaces.q3p" },
  { q: "spaces.q4", p: "spaces.q4p" },
];

export function CreateSpaceModal({ open, onOpenChange, onCreateSpace }: CreateSpaceModalProps) {
  const { t } = useTranslation();
  const QUESTIONS = QUESTION_KEYS.map((k) => ({ q: t(k.q), placeholder: t(k.p) }));
  const [phase, setPhase] = useState<Phase>("basic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎓");
  const [instructions, setInstructions] = useState("");
  const [refs, setRefs] = useState<Reference[]>([]);

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [freeText, setFreeText] = useState("");
  const [drafting, setDrafting] = useState(false);

  const reset = () => {
    setPhase("basic");
    setName(""); setDescription(""); setIcon("🎓");
    setInstructions(""); setRefs([]);
    setQIndex(0); setAnswers(["", "", "", ""]); setFreeText("");
    setDrafting(false);
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const finalize = (finalInstructions: string) => {
    onCreateSpace(name.trim(), description.trim(), icon, finalInstructions.trim(), refs);
    reset();
    onOpenChange(false);
  };

  const startGuided = () => {
    setPhase("guided");
    setQIndex(0);
  };

  const generateDraft = async (payload: { answers?: { q: string; a: string }[]; freeText?: string }) => {
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-space-instructions", {
        body: { name, description, ...payload },
      });
      if (error) throw error;
      setInstructions((data?.draft || "").trim());
      setPhase("draft");
    } catch (e: any) {
      toast.error(t("spaces.couldntDraft"));
      setPhase("draft");
    } finally {
      setDrafting(false);
    }
  };

  const submitAnswerAndAdvance = async (skip = false) => {
    const next = [...answers];
    if (skip) next[qIndex] = "";
    setAnswers(next);
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      const packed = QUESTIONS.map((qq, i) => ({ q: qq.q, a: next[i] }));
      await generateDraft({ answers: packed });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px] border-border/30 bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            {phase !== "basic" && (
              <button
                onClick={() => setPhase("basic")}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("common.back")}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {phase === "basic" && t("spaces.createSpace")}
            {phase === "guided" && t("spaces.letsSetup")}
            {phase === "freetext" && t("spaces.describeSpace")}
            {phase === "draft" && t("spaces.reviewInstructions")}
          </DialogTitle>
        </DialogHeader>

        {phase === "basic" && (
          <>
            <div className="space-y-5 py-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("spaces.spaceName")}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("spaces.spaceNamePlaceholder")}
                  className="bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("spaces.description")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("spaces.descriptionPlaceholder")}
                  className="bg-muted/30 border-border/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("spaces.icon")}</label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("spaces.referencesLabel")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
                </label>
                <SpaceReferencesEditor value={refs} onChange={(next) => setRefs(next)} />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => close(false)}>{t("common.cancel")}</Button>
              <Button
                variant="secondary"
                onClick={() => finalize("")}
                disabled={!name.trim()}
                title={t("spaces.quickCreateTitle")}
              >
                {t("spaces.quickCreate")}
              </Button>
              <Button onClick={startGuided} disabled={!name.trim()} className="gap-1.5">
                <Sparkles className="w-4 h-4" />
                {t("spaces.createWithAI")}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "guided" && (
          <>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("spaces.questionOf", { current: qIndex + 1, total: QUESTIONS.length })}
                </p>
                <button
                  onClick={() => setPhase("freetext")}
                  className="text-xs text-primary hover:underline"
                >
                  {t("spaces.skipAll")}
                </button>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground mb-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {QUESTIONS[qIndex].q}
                </p>
                <Textarea
                  value={answers[qIndex]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[qIndex] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder={QUESTIONS[qIndex].placeholder}
                  rows={3}
                  className="bg-background border-border/30 resize-none"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => submitAnswerAndAdvance(true)} disabled={drafting}>
                {t("common.skip")}
              </Button>
              <Button onClick={() => submitAnswerAndAdvance(false)} disabled={drafting} className="gap-1.5">
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {qIndex === QUESTIONS.length - 1 ? t("spaces.generateDraft") : t("common.next")}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "freetext" && (
          <>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {t("spaces.freetextDesc")}
              </p>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={t("spaces.freetextPlaceholder")}
                rows={5}
                className="bg-muted/30 border-border/30 resize-none"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setInstructions("");
                  setPhase("draft");
                }}
              >
                {t("spaces.skipNoInstructions")}
              </Button>
              <Button
                onClick={() => generateDraft({ freeText })}
                disabled={drafting || !freeText.trim()}
                className="gap-1.5"
              >
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t("spaces.generateDraft")}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "draft" && (
          <>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t("spaces.draftHelper")}
              </p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("spaces.aiInstructionsPlaceholder")}
                rows={10}
                className="bg-muted/30 border-border/30 resize-none font-mono text-sm"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPhase("basic")}>{t("common.back")}</Button>
              <Button onClick={() => finalize(instructions)} disabled={!name.trim()}>
                {t("spaces.createSpaceCta")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
