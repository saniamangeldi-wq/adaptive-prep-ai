 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_ANON_KEY") ?? "",
       { global: { headers: { Authorization: authHeader } } }
     );
 
     const { data: { user }, error: authError } = await supabase.auth.getUser();
     if (authError || !user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const { url } = await req.json();
 
     if (!url || !isValidUrl(url)) {
       return new Response(JSON.stringify({ error: "Invalid URL" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Fetch the website
     const response = await fetch(url, {
       headers: {
         "User-Agent": "Mozilla/5.0 (compatible; AdaptivePrep/1.0; +https://adaptiveprep.app)",
       },
     });
 
     if (!response.ok) {
       return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const html = await response.text();
     const doc = new DOMParser().parseFromString(html, "text/html");
 
     if (!doc) {
       return new Response(JSON.stringify({ error: "Failed to parse HTML" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Extract metadata
     const title = doc.querySelector("title")?.textContent || 
                   doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || 
                   "Untitled";
     
     const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || 
                        doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || 
                        "";
     
     let favicon = doc.querySelector('link[rel="icon"]')?.getAttribute("href") || 
                   doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") || 
                   "/favicon.ico";
     
     // Make favicon absolute URL
     try {
       favicon = new URL(favicon, url).href;
     } catch {
       favicon = "";
     }
 
     // Remove scripts, styles, nav, footer for cleaner content
    const elementsToRemove = doc.querySelectorAll("script, style, nav, footer, header, .advertisement, .ads, aside") || [];
    for (const el of elementsToRemove) {
      el.parentNode?.removeChild(el);
    }
 
     // Get main content
     const mainContent = doc.querySelector("article, main, .content, #content, [role='main']") || doc.body;
     let content = mainContent?.textContent || "";
     
     // Clean up whitespace
     content = content
       .replace(/\s+/g, " ")
       .trim()
       .substring(0, 10000); // Limit to 10k chars
 
     return new Response(
       JSON.stringify({
         title: title.trim(),
         description: description.trim(),
         favicon,
         content,
         url,
       }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("URL fetch error:", error);
     return new Response(
       JSON.stringify({ error: "Failed to fetch URL" }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });
 
 function isValidUrl(string: string): boolean {
   try {
     const url = new URL(string);
     return url.protocol === "http:" || url.protocol === "https:";
   } catch {
     return false;
   }
 }