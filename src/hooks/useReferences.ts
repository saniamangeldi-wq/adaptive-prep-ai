import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface Reference {
  id: string;
  type: "document" | "url" | "text";
  name: string;
  content: string;
  isLoading?: boolean;
  wordCount?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function extractPDFText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 15);
    let text = "";
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      text += tc.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
    }
    if (text.length > 15000) text = text.substring(0, 15000) + "... [truncated]";
    return text.trim();
  } catch {
    return "";
  }
}

export function useReferences() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const addDocument = useCallback(async (file: File) => {
    const tempId = `ref-${Date.now()}`;
    setReferences((prev) => [
      ...prev,
      { id: tempId, type: "document", name: file.name, content: "", isLoading: true },
    ]);
    setIsProcessing(true);

    try {
      let content = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        content = await extractPDFText(file);
      } else {
        content = await file.text();
        if (content.length > 15000) content = content.substring(0, 15000) + "... [truncated]";
      }

      if (!content) {
        toast.error("Could not extract text from file");
        setReferences((prev) => prev.filter((r) => r.id !== tempId));
        return;
      }

      setReferences((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? { ...r, content, isLoading: false, wordCount: content.split(/\s+/).length }
            : r
        )
      );
      toast.success(`${file.name} added as reference`);
    } catch {
      toast.error("Failed to process file");
      setReferences((prev) => prev.filter((r) => r.id !== tempId));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const addUrl = useCallback(async (url: string) => {
    if (!user?.id) return;
    try {
      new URL(url);
    } catch {
      toast.error("Invalid URL");
      return;
    }

    const tempId = `ref-${Date.now()}`;
    const domain = new URL(url).hostname;
    setReferences((prev) => [
      ...prev,
      { id: tempId, type: "url", name: domain, content: "", isLoading: true },
    ]);
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to fetch URL");
      const data = await response.json();
      const content = data.content || "";

      setReferences((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
                ...r,
                name: data.title || domain,
                content,
                isLoading: false,
                wordCount: content.split(/\s+/).length,
              }
            : r
        )
      );
      toast.success("URL added as reference");
    } catch {
      toast.error("Failed to fetch URL content");
      setReferences((prev) => prev.filter((r) => r.id !== tempId));
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const addText = useCallback((text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    setReferences((prev) => [
      ...prev,
      {
        id: `ref-${Date.now()}`,
        type: "text",
        name: `Pasted text (${wordCount} words)`,
        content: text.trim(),
        wordCount,
      },
    ]);
    toast.success("Text added as reference");
  }, []);

  const removeReference = useCallback((id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearReferences = useCallback(() => {
    setReferences([]);
  }, []);

  const getReferenceContext = useCallback(() => {
    const active = references.filter((r) => !r.isLoading && r.content);
    if (active.length === 0) return "";

    let context = "\n\n---REFERENCE DOCUMENTS---";
    for (const ref of active) {
      const label =
        ref.type === "document"
          ? `📄 ${ref.name}`
          : ref.type === "url"
          ? `🔗 ${ref.name}`
          : `📝 ${ref.name}`;
      const truncated =
        ref.content.length > 5000
          ? ref.content.substring(0, 5000) + "..."
          : ref.content;
      context += `\n\n[${label}]\n${truncated}`;
    }
    return context;
  }, [references]);

  // Load references from a space's stored references
  const loadSpaceReferences = useCallback((spaceRefs: Reference[]) => {
    setReferences((prev) => {
      // Merge: keep conversation-level refs, add space refs that aren't already present
      const existingIds = new Set(prev.map((r) => r.id));
      const newRefs = spaceRefs.filter((r) => !existingIds.has(r.id));
      return [...prev, ...newRefs];
    });
  }, []);

  return {
    references,
    isProcessing,
    addDocument,
    addUrl,
    addText,
    removeReference,
    clearReferences,
    getReferenceContext,
    loadSpaceReferences,
    setReferences,
  };
}
