import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Presentation, Sheet, FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentWidgetProps {
  type: "pptx" | "xlsx" | "docx";
  title: string;
  content: Record<string, unknown>;
  summary?: string;
}

const typeConfig = {
  pptx: {
    icon: Presentation,
    label: "Presentation",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  xlsx: {
    icon: Sheet,
    label: "Spreadsheet",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  docx: {
    icon: FileText,
    label: "Document",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

export function DocumentWidget({ type, title, content, summary }: DocumentWidgetProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<Record<string, { url: string; fileName: string }>>({});

  const config = typeConfig[type] || typeConfig.docx;
  const Icon = config.icon;

  const handleGenerate = async (genType: string) => {
    setIsGenerating(genType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to generate documents");
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: genType, content }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate document");
      }

      const result = await response.json();
      setDownloads(prev => ({ ...prev, [genType]: { url: result.url, fileName: result.fileName } }));
      toast.success(`File generated successfully!`);
    } catch (error) {
      console.error("Document generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate document");
    } finally {
      setIsGenerating(null);
    }
  };

  const renderPreview = () => {
    if (type === "pptx" && content.slides) {
      const slides = content.slides as Array<{ title: string; content: string }>;
      return (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {slides.map((slide, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-muted-foreground font-mono shrink-0">#{i + 1}</span>
              <span className="font-medium truncate">{slide.title}</span>
            </div>
          ))}
        </div>
      );
    }
    if (type === "xlsx" && content.sheets) {
      const sheets = content.sheets as Array<{ name: string; headers: string[]; rows: string[][] }>;
      return (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sheets.map((sheet, i) => (
            <div key={i} className="text-xs">
              <span className="font-medium">{sheet.name}</span>
              <span className="text-muted-foreground ml-2">
                {sheet.headers.length} cols × {sheet.rows.length} rows
              </span>
            </div>
          ))}
        </div>
      );
    }
    if (type === "docx" && content.sections) {
      const sections = content.sections as Array<{ heading?: string; body: string }>;
      return (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={i} className="text-xs">
              {section.heading && <span className="font-medium">{section.heading}</span>}
              <p className="text-muted-foreground line-clamp-2">{section.body}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderDownloadButton = (genType: string, label: string, ext: string) => {
    const dl = downloads[genType];
    if (dl) {
      return (
        <Button size="sm" asChild className="flex-1">
          <a href={dl.url} download={dl.fileName || `${title}.${ext}`} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            .{ext}
          </a>
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant={genType === type ? "default" : "outline"}
        onClick={() => handleGenerate(genType)}
        disabled={isGenerating !== null}
        className="flex-1"
      >
        {isGenerating === genType ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileIcon className="w-4 h-4 mr-2" />
            .{ext}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 space-y-3`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{title}</h4>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </div>
      </div>

      {summary && (
        <p className="text-xs text-muted-foreground">{summary}</p>
      )}

      {renderPreview()}

      <div className="flex gap-2 pt-1">
        {type === "pptx" ? (
          <>
            {renderDownloadButton("pptx", "PowerPoint", "pptx")}
            {renderDownloadButton("slides_pdf", "PDF", "pdf")}
          </>
        ) : (
          renderDownloadButton(type, config.label, type)
        )}
      </div>
    </div>
  );
}
