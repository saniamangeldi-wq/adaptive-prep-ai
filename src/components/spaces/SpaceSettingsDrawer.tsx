import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2, AlertCircle } from "lucide-react";
import { ConversationSpace } from "@/hooks/useConversations";
import type { Reference } from "@/hooks/useReferences";
import { IconPicker } from "./IconPicker";
import { SpaceReferencesEditor } from "./SpaceReferencesEditor";
import { toast } from "sonner";

interface SpaceSettingsDrawerProps {
  space: ConversationSpace | null;
  open: boolean;
  onClose: () => void;
  onSave: (spaceId: string, updates: { name: string; description: string; icon: string; ai_instructions?: string; references?: Reference[] }) => void;
  onDelete: (spaceId: string) => void;
  spaceReferences?: Reference[];
}

export function SpaceSettingsDrawer({ space, open, onClose, onSave, onDelete, spaceReferences = [] }: SpaceSettingsDrawerProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎓");
  const [aiInstructions, setAiInstructions] = useState("");
  const [refs, setRefs] = useState<Reference[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const initial = useMemo(() => ({
    name: space?.name ?? "",
    description: space?.description || "",
    icon: space?.icon ?? "🎓",
    ai_instructions: (space as any)?.ai_instructions || "",
    references: spaceReferences,
  }), [space, spaceReferences]);

  useEffect(() => {
    if (space) {
      setName(initial.name);
      setDescription(initial.description);
      setIcon(initial.icon);
      setAiInstructions(initial.ai_instructions);
      setRefs(initial.references);
      setConfirmDelete(false);
      setShowUnsavedPrompt(false);
    }
  }, [space, initial]);

  const isDirty = useMemo(() => {
    if (!space) return false;
    if (name !== initial.name) return true;
    if (description !== initial.description) return true;
    if (icon !== initial.icon) return true;
    if (aiInstructions !== initial.ai_instructions) return true;
    if (JSON.stringify(refs) !== JSON.stringify(initial.references)) return true;
    return false;
  }, [name, description, icon, aiInstructions, refs, initial, space]);

  if (!open || !space) return null;

  const doSave = () => {
    onSave(space.id, {
      name: name.trim(),
      description: description.trim(),
      icon,
      ai_instructions: aiInstructions.trim() || undefined,
      references: refs,
    });
    toast.success(t("spaces.spaceUpdated"));
    setShowUnsavedPrompt(false);
    onClose();
  };

  const attemptClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
      return;
    }
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(space.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={attemptClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-[360px] max-w-[90vw] bg-card border-l border-border/30 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            {t("spaces.spaceSettings")}
            {isDirty && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {t("spaces.unsaved")}
              </span>
            )}
          </h2>
          <button onClick={attemptClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("spaces.name")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("spaces.description")}</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t("spaces.icon")}</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("spaces.aiInstructions")}</label>
            <Textarea
              placeholder={t("spaces.aiInstructionsCustom")}
              rows={6}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="bg-muted/30 border-border/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t("spaces.spaceReferences")}</label>
            <p className="text-xs text-muted-foreground mb-2">
              {t("spaces.spaceRefsDesc")}
            </p>
            <SpaceReferencesEditor value={refs} onChange={(next) => setRefs(next)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t("spaces.visibility")}</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="radio" name="visibility" checked readOnly className="accent-primary" />
                {t("spaces.private")}
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                <input type="radio" name="visibility" disabled className="accent-primary" />
                {t("spaces.shared")} <span className="text-xs">({t("common.comingSoon")})</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-border/30">
            <p className="text-xs font-medium text-destructive mb-3 uppercase tracking-wider">{t("spaces.dangerZone")}</p>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? t("spaces.deleteConfirm") : t("spaces.deleteSpace")}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={attemptClose}>{t("common.cancel")}</Button>
          <Button className="flex-1" onClick={doSave} disabled={!name.trim() || !isDirty}>
            {t("spaces.saveChanges")}
          </Button>
        </div>
      </div>

      {/* Unsaved changes prompt */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border/30 rounded-xl p-5 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("spaces.unsavedTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("spaces.unsavedDesc")}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={doSave} disabled={!name.trim()}>{t("spaces.saveChanges")}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnsavedPrompt(false);
                  onClose();
                }}
              >
                {t("spaces.discard")}
              </Button>
              <Button variant="ghost" onClick={() => setShowUnsavedPrompt(false)}>
                {t("spaces.keepEditing")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
