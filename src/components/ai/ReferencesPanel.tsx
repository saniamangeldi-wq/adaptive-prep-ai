import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Plus,
  FileText,
  Link2,
  ClipboardPaste,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reference } from "@/hooks/useReferences";

interface ReferencesPanelProps {
  references: Reference[];
  isProcessing: boolean;
  onAddDocument: (file: File) => void;
  onAddUrl: (url: string) => void;
  onAddText: (text: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function ReferencesPanel({
  references,
  isProcessing,
  onAddDocument,
  onAddUrl,
  onAddText,
  onRemove,
  onClose,
}: ReferencesPanelProps) {
  const [mode, setMode] = useState<"list" | "url" | "paste">("list");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onAddUrl(urlValue.trim());
      setUrlValue("");
      setMode("list");
    }
  };

  const handleTextSubmit = () => {
    if (textValue.trim()) {
      onAddText(textValue.trim());
      setTextValue("");
      setMode("list");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) onAddDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "document":
        return "📄";
      case "url":
        return "🔗";
      case "text":
        return "📝";
      default:
        return "📄";
    }
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-sm">📚</span>
          <span className="text-sm font-medium text-foreground">References</span>
          {references.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {references.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setMode("list")}
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[240px]">
        {mode === "url" ? (
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Paste a website URL to extract its content</p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/article"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                autoFocus
                className="bg-muted/30 border-border/30 text-sm h-8"
              />
              <Button size="sm" className="h-8" onClick={handleUrlSubmit} disabled={!urlValue.trim()}>
                Add
              </Button>
            </div>
            <button onClick={() => setMode("list")} className="text-xs text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </div>
        ) : mode === "paste" ? (
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Paste text content to use as a reference</p>
            <Textarea
              placeholder="Paste your reference text here..."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              rows={4}
              autoFocus
              className="bg-muted/30 border-border/30 text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <button onClick={() => setMode("list")} className="text-xs text-muted-foreground hover:text-foreground">
                ← Back
              </button>
              <Button size="sm" className="h-7 text-xs" onClick={handleTextSubmit} disabled={!textValue.trim()}>
                Add Text
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Reference items */}
            <ScrollArea className={references.length > 3 ? "h-[160px]" : ""}>
              <div className="p-2 space-y-1">
                {references.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    No references yet — add documents, URLs, or text
                  </p>
                ) : (
                  references.map((ref) => (
                    <div
                      key={ref.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg group",
                        "border-l-2 border-l-primary/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                      )}
                    >
                      {ref.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                      ) : (
                        <span className="text-sm flex-shrink-0">{getIcon(ref.type)}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{ref.name}</p>
                        {ref.wordCount && !ref.isLoading && (
                          <p className="text-[10px] text-muted-foreground">{ref.wordCount.toLocaleString()} words</p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(ref.id)}
                        className="p-1 rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        disabled={ref.isLoading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Add buttons */}
            <div className="p-2 pt-0 flex items-center gap-1.5 border-t border-border/10">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 flex-1 border-border/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <FileText className="w-3 h-3" />
                Upload PDF/Doc
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 flex-1 border-border/20"
                onClick={() => setMode("url")}
                disabled={isProcessing}
              >
                <Link2 className="w-3 h-3" />
                Add URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 flex-1 border-border/20"
                onClick={() => setMode("paste")}
                disabled={isProcessing}
              >
                <ClipboardPaste className="w-3 h-3" />
                Paste
              </Button>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
