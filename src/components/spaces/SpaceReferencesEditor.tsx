import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, FileText, Link2, ClipboardPaste, Pencil, Check, Loader2, RefreshCw } from "lucide-react";
import type { Reference } from "@/hooks/useReferences";
import { fetchUrlAsReference, makeTextReference, makeDocumentReference } from "@/lib/spaceReferences";
import { toast } from "sonner";

interface Props {
  value: Reference[];
  onChange: (refs: Reference[]) => void | Promise<void>;
}

const getRefIcon = (type: string) => (type === "document" ? "📄" : type === "url" ? "🔗" : "📝");

export function SpaceReferencesEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<"none" | "url" | "paste">("none");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commit = async (next: Reference[]) => {
    await onChange(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBusy(true);
    try {
      const added: Reference[] = [];
      for (const file of files) {
        try {
          added.push(await makeDocumentReference(file));
        } catch {
          toast.error(`Failed to read ${file.name}`);
        }
      }
      if (added.length) {
        await commit([...value, ...added]);
        toast.success(`${added.length} file(s) added`);
      }
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;
    setBusy(true);
    try {
      const ref = await fetchUrlAsReference(url);
      await commit([...value, ref]);
      setUrlValue("");
      setMode("none");
      toast.success("URL added");
    } catch (err: any) {
      toast.error(err?.message === "Failed to fetch URL" ? "Couldn't fetch that URL" : "Invalid URL");
    } finally {
      setBusy(false);
    }
  };

  const handleAddText = async () => {
    if (!textValue.trim()) return;
    const ref = makeTextReference(textValue);
    await commit([...value, ref]);
    setTextValue("");
    setMode("none");
    toast.success("Text added");
  };

  const startEdit = (ref: Reference) => {
    setEditingId(ref.id);
    setEditName(ref.name);
    setEditContent(ref.type === "text" ? ref.content : "");
    setEditUrl("");
  };

  const saveEdit = async (ref: Reference) => {
    let updated: Reference = { ...ref, name: editName.trim() || ref.name };
    if (ref.type === "text" && editContent.trim()) {
      const wc = editContent.trim().split(/\s+/).filter(Boolean).length;
      updated = { ...updated, content: editContent.trim(), wordCount: wc };
    }
    if (ref.type === "url" && editUrl.trim()) {
      setBusy(true);
      try {
        const fetched = await fetchUrlAsReference(editUrl.trim());
        updated = { ...updated, name: editName.trim() || fetched.name, content: fetched.content, wordCount: fetched.wordCount };
      } catch {
        toast.error("Couldn't fetch replacement URL");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    await commit(value.map((r) => (r.id === ref.id ? updated : r)));
    setEditingId(null);
    toast.success("Reference updated");
  };

  const removeRef = async (id: string) => {
    await commit(value.filter((r) => r.id !== id));
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="space-y-1 mb-2">
          {value.map((ref) => {
            const isEditing = editingId === ref.id;
            return (
              <div key={ref.id} className="rounded-lg border-l-2 border-l-primary/40 bg-muted/20 group">
                {!isEditing ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    {ref.isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    ) : (
                      <span className="text-sm flex-shrink-0">{getRefIcon(ref.type)}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ref.name}</p>
                      {ref.wordCount ? (
                        <p className="text-[10px] text-muted-foreground">{ref.wordCount} words</p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => startEdit(ref)}
                      className="p-1 rounded text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeRef(ref.id)}
                      className="p-1 rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="bg-muted/30 border-border/30 text-sm h-8"
                    />
                    {ref.type === "text" && (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="bg-muted/30 border-border/30 text-xs resize-none"
                      />
                    )}
                    {ref.type === "url" && (
                      <div className="flex gap-1">
                        <Input
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="Replace with new URL (optional)"
                          className="bg-muted/30 border-border/30 text-sm h-8"
                        />
                        {editUrl && <RefreshCw className="w-3.5 h-3.5 self-center text-muted-foreground" />}
                      </div>
                    )}
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveEdit(ref)} disabled={busy}>
                        <Check className="w-3 h-3" /> Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode === "url" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              autoFocus
              disabled={busy}
              className="bg-muted/30 border-border/30 text-sm h-8"
            />
            <Button size="sm" className="h-8" onClick={handleAddUrl} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
            </Button>
          </div>
          <button onClick={() => setMode("none")} className="text-xs text-muted-foreground">← Back</button>
        </div>
      ) : mode === "paste" ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste reference text..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={3}
            autoFocus
            className="bg-muted/30 border-border/30 text-sm resize-none"
          />
          <div className="flex justify-between">
            <button onClick={() => setMode("none")} className="text-xs text-muted-foreground">← Back</button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAddText}>Add</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <FileText className="w-3 h-3" /> Upload
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => setMode("url")}>
            <Link2 className="w-3 h-3" /> URL
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => setMode("paste")}>
            <ClipboardPaste className="w-3 h-3" /> Paste
          </Button>
        </div>
      )}
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleFileUpload} />
    </div>
  );
}
