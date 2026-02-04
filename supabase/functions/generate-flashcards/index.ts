import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    if (profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ 
        error: "No credits remaining",
        cards: [] 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic, cardCount, sourceType, customContent } = await req.json();

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct 1 credit
    await supabase
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("user_id", user.id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build the prompt
    let prompt: string;
    if (sourceType === "custom" && customContent) {
      prompt = `Create exactly ${cardCount} educational flashcards about "${topic}" using this content:

${customContent}

Each flashcard should have:
- A clear, specific question or term on the front
- A detailed, accurate answer or definition on the back`;
    } else {
      prompt = `Create exactly ${cardCount} SAT-level educational flashcards about "${topic}".

Each flashcard should have:
- A clear, specific question or term on the front  
- A detailed, accurate answer or definition on the back
- Content appropriate for SAT preparation`;
    }

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating high-quality flashcards. Generate flashcards that are clear, accurate, and educational."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_flashcards",
              description: "Create a set of educational flashcards",
              parameters: {
                type: "object",
                properties: {
                  flashcards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { 
                          type: "string",
                          description: "The question, term, or concept (front of card)"
                        },
                        back: { 
                          type: "string",
                          description: "The answer, definition, or explanation (back of card)"
                        }
                      },
                      required: ["front", "back"]
                    }
                  }
                },
                required: ["flashcards"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_flashcards" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later.", cards: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI service error");
    }

    const data = await response.json();
    
    // Extract flashcards from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_flashcards") {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("Failed to generate flashcards");
    }

    const args = JSON.parse(toolCall.function.arguments);
    const cards = args.flashcards || [];

    if (cards.length === 0) {
      throw new Error("No flashcards generated");
    }

    console.log(`Generated ${cards.length} flashcards for topic: ${topic}`);

    return new Response(JSON.stringify({ 
      cards,
      topic,
      creditsRemaining: profile.credits_remaining - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-flashcards error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      cards: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
