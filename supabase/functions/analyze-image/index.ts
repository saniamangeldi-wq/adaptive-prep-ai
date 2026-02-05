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
 
     const { imageUrl, prompt } = await req.json();
 
     if (!imageUrl) {
       return new Response(JSON.stringify({ error: "Image URL is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       return new Response(JSON.stringify({ error: "AI API key not configured" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Use Lovable AI with vision capabilities (Gemini)
     const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           {
             role: "user",
             content: [
               {
                 type: "text",
                 text: prompt || "Describe this image in detail. If it contains text, transcribe it. If it contains math problems, equations, or diagrams, explain them thoroughly. If it's a homework problem or test question, identify the subject and key concepts.",
               },
               {
                 type: "image_url",
                 image_url: {
                   url: imageUrl,
                 },
               },
             ],
           },
         ],
         max_tokens: 1500,
       }),
     });
 
     if (!aiResponse.ok) {
       const errorText = await aiResponse.text();
       console.error("AI vision error:", errorText);
       return new Response(JSON.stringify({ error: "Failed to analyze image" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const data = await aiResponse.json();
     const analysis = data.choices?.[0]?.message?.content || "Unable to analyze image";
 
     return new Response(
       JSON.stringify({ analysis }),
       {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("Image analysis error:", error);
     return new Response(
       JSON.stringify({ error: "Failed to analyze image" }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });