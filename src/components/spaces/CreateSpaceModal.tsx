import { useState } from "react";
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

const QUESTIONS: { q: string; placeholder: string }[] = [
  { q: "What subject or goal is this space for?", placeholder: "e.g. SAT Math prep, essay coaching, biology review" },
  { q: "Who is it for — you, or students you teach?", placeholder: "e.g. Just me / My 10th-grade students" },
  { q: "What tone should the AI use?", placeholder: "e.g. Encouraging and Socratic, or strict and concise" },
  { q: "Any sources or references it must rely on?", placeholder: "e.g. Only the uploaded notes / official College Board rules" },
];

export function CreateSpaceModal({ open, onOpenChange, onCreateSpace }: CreateSpaceModalProps) {
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
      toast.error("Couldn't draft instructions. You can write them yourself.");
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
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {phase === "basic" && "Create a Space"}
            {phase === "guided" && "Let's set up your Space"}
            {phase === "freetext" && "Describe your Space"}
            {phase === "draft" && "Review AI Instructions"}
          </DialogTitle>
        </DialogHeader>

        {phase === "basic" && (
          <>
            <div className="space-y-5 py-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Space Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., SAT Math Prep"
                  className="bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this space"
                  className="bg-muted/30 border-border/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Icon</label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  📚 References <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <SpaceReferencesEditor value={refs} onChange={(next) => setRefs(next)} />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button
                variant="secondary"
                onClick={() => finalize("")}
                disabled={!name.trim()}
                title="Create with no AI instructions"
              >
                Quick create
              </Button>
              <Button onClick={startGuided} disabled={!name.trim()} className="gap-1.5">
                <Sparkles className="w-4 h-4" />
                Create with AI setup
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "guided" && (
          <>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Question {qIndex + 1} of {QUESTIONS.length}
                </p>
                <button
                  onClick={() => setPhase("freetext")}
                  className="text-xs text-primary hover:underline"
                >
                  Skip all · I'll write it myself
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
                Skip
              </Button>
              <Button onClick={() => submitAnswerAndAdvance(false)} disabled={drafting} className="gap-1.5">
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {qIndex === QUESTIONS.length - 1 ? "Generate draft" : "Next"}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "freetext" && (
          <>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Briefly describe what this space is for. The AI will turn it into instructions.
              </p>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="e.g. Help me prep for SAT Math. Use a Socratic tone and only rely on my uploaded notes."
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
                Skip — no instructions
              </Button>
              <Button
                onClick={() => generateDraft({ freeText })}
                disabled={drafting || !freeText.trim()}
                className="gap-1.5"
              >
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate draft
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "draft" && (
          <>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Edit freely — this is what the AI will follow in this Space.
              </p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="AI instructions for this space..."
                rows={10}
                className="bg-muted/30 border-border/30 resize-none font-mono text-sm"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPhase("basic")}>Back</Button>
              <Button onClick={() => finalize(instructions)} disabled={!name.trim()}>
                Create Space →
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
