 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
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
 
     const { query } = await req.json();
 
     if (!query || typeof query !== "string") {
       return new Response(JSON.stringify({ error: "Query is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
     if (!PERPLEXITY_API_KEY) {
       return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Use Perplexity API for web search
     const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "sonar",
         messages: [
           {
             role: "system",
             content: "You are a helpful research assistant. Search the web and provide accurate, well-sourced information. Be concise but comprehensive.",
           },
           {
             role: "user",
             content: query,
           },
         ],
       }),
     });
 
     if (!perplexityResponse.ok) {
       const errorText = await perplexityResponse.text();
       console.error("Perplexity API error:", errorText);
       return new Response(JSON.stringify({ error: "Search failed" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const data = await perplexityResponse.json();
     const content = data.choices?.[0]?.message?.content || "";
     const citations = data.citations || [];
 
     // Format sources
     const sources = citations.map((cite: string, i: number) => ({
       number: i + 1,
       url: cite,
       title: cite,
     }));
 
     // Combine content with citations
     const combinedContent = sources.length > 0
       ? `${content}\n\nSources:\n${sources.map((s: { number: number; title: string; url: string }) => `[${s.number}] ${s.title}`).join("\n")}`
       : content;
 
     return new Response(
       JSON.stringify({
         content,
         sources,
         combined_content: combinedContent,
         query,
       }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("Web search error:", error);
     return new Response(
       JSON.stringify({ error: "Search failed" }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });