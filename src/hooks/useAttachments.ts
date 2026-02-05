 import { useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Extract text from PDF file
async function extractPDFText(file: File): Promise<{ text: string; pageCount: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    
    let fullText = "";
    const maxPages = Math.min(pageCount, 15); // Limit to first 15 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    if (pageCount > maxPages) {
      fullText += `\n\n[... ${pageCount - maxPages} more pages not extracted]`;
    }
    
    // Truncate if too long
    if (fullText.length > 15000) {
      fullText = fullText.substring(0, 15000) + "... [truncated]";
    }
    
    return { text: fullText.trim(), pageCount };
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return { text: "", pageCount: 0 };
  }
}
 
 export interface Attachment {
   id: string;
   type: "image" | "document" | "url" | "web_search";
   file_name: string | null;
   file_url: string | null;
   file_size: number | null;
   mime_type: string | null;
   extracted_text: string | null;
  metadata: Json;
   isUploading?: boolean;
 }
 
 const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
 
 export function useAttachments(conversationId?: string) {
   const [attachments, setAttachments] = useState<Attachment[]>([]);
   const [isUploading, setIsUploading] = useState(false);
   const { user } = useAuth();
 
   // Upload file to storage and create attachment
   const uploadFile = useCallback(async (file: File, type: "image" | "document" = "document") => {
     if (!user?.id) {
       toast.error("You must be logged in to upload files");
       return null;
     }
 
     const tempId = `temp-${Date.now()}`;
     const tempAttachment: Attachment = {
       id: tempId,
       type,
       file_name: file.name,
       file_url: null,
       file_size: file.size,
       mime_type: file.type,
       extracted_text: null,
       metadata: {},
       isUploading: true,
     };
 
     setAttachments(prev => [...prev, tempAttachment]);
     setIsUploading(true);
 
     try {
       // Upload to Supabase Storage
       const fileExt = file.name.split(".").pop();
       const fileName = `${user.id}/${Date.now()}.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from("conversation-uploads")
         .upload(fileName, file);
 
       if (uploadError) throw uploadError;
 
       // Get public URL
       const { data: urlData } = supabase.storage
         .from("conversation-uploads")
         .getPublicUrl(fileName);
 
       const fileUrl = urlData.publicUrl;
 
       // Process file based on type
       let extractedText = "";
      let metadata: Json = {};
 
       if (type === "image") {
         // Use AI vision to analyze image
         const { data: { session } } = await supabase.auth.getSession();
         if (session?.access_token) {
           try {
             const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image`, {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${session.access_token}`,
                 "Content-Type": "application/json",
               },
               body: JSON.stringify({ imageUrl: fileUrl }),
             });
 
             if (response.ok) {
               const data = await response.json();
               extractedText = data.analysis || "";
             }
           } catch (err) {
             console.error("Image analysis failed:", err);
           }
         }
         
         // Get image dimensions
         const img = new Image();
         img.src = URL.createObjectURL(file);
         await new Promise((resolve) => {
           img.onload = resolve;
           img.onerror = resolve;
         });
         metadata = { width: img.width, height: img.height };
         URL.revokeObjectURL(img.src);
      } else if (file.type.startsWith("text/") || (file.name && file.name.endsWith(".md")) || (file.name && file.name.endsWith(".txt"))) {
         // Read text file content
         extractedText = await file.text();
         if (extractedText.length > 10000) {
           extractedText = extractedText.substring(0, 10000) + "... [truncated]";
         }
      } else if (file.type === "application/pdf" || (file.name && file.name.endsWith(".pdf"))) {
        // Extract text from PDF
        const pdfResult = await extractPDFText(file);
        extractedText = pdfResult.text;
        metadata = { pageCount: pdfResult.pageCount };
       }
 
       // Create the final attachment
       const finalAttachment: Attachment = {
         id: tempId, // Will be updated if saved to DB
         type,
         file_name: file.name,
         file_url: fileUrl,
         file_size: file.size,
         mime_type: file.type,
         extracted_text: extractedText,
         metadata,
         isUploading: false,
       };
 
       // Optionally save to database if we have a conversation
       if (conversationId) {
        const insertData = {
          conversation_id: conversationId,
          user_id: user.id,
          type: type as string,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          extracted_text: extractedText || null,
          metadata: metadata as Json,
        };
        const { data: savedAtt, error: saveError } = await supabase
           .from("conversation_attachments")
          .insert([insertData])
           .select()
           .single();
 
         if (!saveError && savedAtt) {
           finalAttachment.id = savedAtt.id;
         }
       }
 
       setAttachments(prev => prev.map(a => a.id === tempId ? finalAttachment : a));
       toast.success(`${file.name} uploaded`);
       return finalAttachment;
 
     } catch (error) {
       console.error("Upload error:", error);
       toast.error("Failed to upload file");
       setAttachments(prev => prev.filter(a => a.id !== tempId));
       return null;
     } finally {
       setIsUploading(false);
     }
   }, [user, conversationId]);
 
   // Attach a URL
   const attachUrl = useCallback(async (url: string) => {
     if (!user?.id) {
       toast.error("You must be logged in");
       return null;
     }
 
     if (!isValidUrl(url)) {
       toast.error("Invalid URL");
       return null;
     }
 
     const tempId = `temp-${Date.now()}`;
     const tempAttachment: Attachment = {
       id: tempId,
       type: "url",
       file_name: "Loading...",
       file_url: url,
       file_size: null,
       mime_type: null,
       extracted_text: null,
       metadata: {},
       isUploading: true,
     };
 
     setAttachments(prev => [...prev, tempAttachment]);
     setIsUploading(true);
 
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.access_token) throw new Error("Not authenticated");
 
       const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-url`, {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${session.access_token}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({ url }),
       });
 
       if (!response.ok) throw new Error("Failed to fetch URL");
 
       const data = await response.json();
 
       const finalAttachment: Attachment = {
         id: tempId,
         type: "url",
         file_name: data.title || url,
         file_url: url,
         file_size: null,
         mime_type: null,
         extracted_text: data.content || "",
         metadata: {
           title: data.title,
           description: data.description,
           favicon: data.favicon,
         },
         isUploading: false,
       };
 
       // Save to database if we have a conversation
       if (conversationId) {
        const insertData = {
          conversation_id: conversationId,
          user_id: user.id,
          type: "url",
          file_name: data.title || url,
          file_url: url,
          extracted_text: data.content || null,
          metadata: {
            title: data.title,
            description: data.description,
            favicon: data.favicon,
          } as Json,
        };
        const { data: savedAtt, error: saveError } = await supabase
           .from("conversation_attachments")
          .insert([insertData])
           .select()
           .single();
 
         if (!saveError && savedAtt) {
           finalAttachment.id = savedAtt.id;
         }
       }
 
       setAttachments(prev => prev.map(a => a.id === tempId ? finalAttachment : a));
       toast.success("Website attached");
       return finalAttachment;
 
     } catch (error) {
       console.error("URL fetch error:", error);
       toast.error("Failed to fetch website content");
       setAttachments(prev => prev.filter(a => a.id !== tempId));
       return null;
     } finally {
       setIsUploading(false);
     }
   }, [user, conversationId]);
 
   // Perform web search
   const performWebSearch = useCallback(async (query: string) => {
     if (!user?.id) {
       toast.error("You must be logged in");
       return null;
     }
 
     const tempId = `temp-${Date.now()}`;
     const tempAttachment: Attachment = {
       id: tempId,
       type: "web_search",
       file_name: `Search: ${query}`,
       file_url: null,
       file_size: null,
       mime_type: null,
       extracted_text: null,
       metadata: { query },
       isUploading: true,
     };
 
     setAttachments(prev => [...prev, tempAttachment]);
     setIsUploading(true);
 
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.access_token) throw new Error("Not authenticated");
 
       const response = await fetch(`${SUPABASE_URL}/functions/v1/web-search`, {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${session.access_token}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({ query }),
       });
 
       if (!response.ok) throw new Error("Search failed");
 
       const data = await response.json();
 
       const finalAttachment: Attachment = {
         id: tempId,
         type: "web_search",
         file_name: `Search: ${query}`,
         file_url: null,
         file_size: null,
         mime_type: null,
         extracted_text: data.combined_content || data.content || "",
         metadata: {
           query,
           sources: data.sources || [],
         },
         isUploading: false,
       };
 
       // Save to database if we have a conversation
       if (conversationId) {
        const insertData = {
          conversation_id: conversationId,
          user_id: user.id,
          type: "web_search",
          file_name: `Search: ${query}`,
          extracted_text: data.combined_content || data.content || null,
          metadata: {
            query,
            sources: data.sources || [],
          } as Json,
        };
        const { data: savedAtt, error: saveError } = await supabase
           .from("conversation_attachments")
          .insert([insertData])
           .select()
           .single();
 
         if (!saveError && savedAtt) {
           finalAttachment.id = savedAtt.id;
         }
       }
 
       setAttachments(prev => prev.map(a => a.id === tempId ? finalAttachment : a));
       const sourceCount = data.sources?.length || 0;
       toast.success(`Found ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`);
       return finalAttachment;
 
     } catch (error) {
       console.error("Web search error:", error);
       toast.error("Search failed");
       setAttachments(prev => prev.filter(a => a.id !== tempId));
       return null;
     } finally {
       setIsUploading(false);
     }
   }, [user, conversationId]);
 
   // Remove an attachment
   const removeAttachment = useCallback(async (id: string) => {
     setAttachments(prev => prev.filter(a => a.id !== id));
     
     // Delete from database if it's not a temp ID
     if (!id.startsWith("temp-")) {
       await supabase
         .from("conversation_attachments")
         .delete()
         .eq("id", id);
     }
   }, []);
 
   // Clear all attachments
   const clearAttachments = useCallback(() => {
     setAttachments([]);
   }, []);
 
   // Build context string from attachments for AI
   const getAttachmentContext = useCallback(() => {
     if (attachments.length === 0) return "";
 
     let context = "\n\n---ATTACHED CONTENT---";
 
     for (const att of attachments) {
       if (att.isUploading) continue;
 
       switch (att.type) {
         case "image":
           context += `\n\n[Image: ${att.file_name}]`;
           if (att.extracted_text) {
             context += `\nAI Vision Analysis: ${att.extracted_text}`;
           }
           if (att.file_url) {
             context += `\nImage URL: ${att.file_url}`;
           }
           break;
 
         case "url":
           context += `\n\n[Website: ${(att.metadata as { title?: string })?.title || att.file_name}]`;
           context += `\nURL: ${att.file_url}`;
           if (att.extracted_text) {
             const truncated = att.extracted_text.length > 3000 
               ? att.extracted_text.substring(0, 3000) + "..." 
               : att.extracted_text;
             context += `\nContent: ${truncated}`;
           }
           break;
 
         case "web_search":
           context += `\n\n[Web Search: "${(att.metadata as { query?: string })?.query}"]`;
           if (att.extracted_text) {
             context += `\n${att.extracted_text}`;
           }
           break;
 
         case "document":
           context += `\n\n[Document: ${att.file_name}]`;
           if (att.extracted_text) {
             const truncated = att.extracted_text.length > 5000 
               ? att.extracted_text.substring(0, 5000) + "..." 
               : att.extracted_text;
             context += `\nContent: ${truncated}`;
           }
           break;
       }
     }
 
     return context;
   }, [attachments]);
 
   return {
     attachments,
     isUploading,
     uploadFile,
     attachUrl,
     performWebSearch,
     removeAttachment,
     clearAttachments,
     getAttachmentContext,
   };
 }
 
 function isValidUrl(string: string): boolean {
   try {
     const url = new URL(string);
     return url.protocol === "http:" || url.protocol === "https:";
   } catch {
     return false;
   }
 }