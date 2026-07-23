import { supabase } from "@/integrations/supabase/client";
import type { Reference } from "@/hooks/useReferences";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function fetchUrlAsReference(url: string): Promise<Reference> {
  new URL(url); // throws if invalid
  const domain = new URL(url).hostname;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to fetch URL");
  const data = await res.json();
  const content = (data.content || "").toString();
  if (!content) throw new Error("No content extracted");
  const trimmed = content.length > 15000 ? content.slice(0, 15000) + "... [truncated]" : content;
  return {
    id: `space-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "url",
    name: data.title || domain,
    content: trimmed,
    wordCount: trimmed.split(/\s+/).length,
  };
}

export function makeTextReference(text: string, title?: string): Reference {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return {
    id: `space-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "text",
    name: title?.trim() || `Pasted text (${wordCount} words)`,
    content: trimmed,
    wordCount,
  };
}

export async function makeDocumentReference(file: File): Promise<Reference> {
  const content = await file.text();
  const trimmed = content.length > 15000 ? content.slice(0, 15000) + "... [truncated]" : content;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return {
    id: `space-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "document",
    name: file.name,
    content: trimmed,
    wordCount,
  };
}
