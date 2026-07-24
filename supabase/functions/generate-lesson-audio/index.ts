// Pre-generates narration audio for prebuilt lessons using Lovable AI TTS.
// Stores MP3s in the `generated-documents` bucket and patches
// `prebuilt_lesson_variants.content.slides[i].audio_url` so the client can
// play the cached file directly (zero per-user TTS cost after generation).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "generated-documents";
const MODEL = "openai/gpt-4o-mini-tts";
const VOICE = "alloy";
const VAKS = ["visual", "auditory", "reading_writing", "kinesthetic"] as const;

interface Slide {
  heading?: string;
  bullets?: string[];
  narration?: string;
  example?: string;
  audio_url?: string;
}

async function synthesize(text: string, apiKey: string): Promise<Uint8Array | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: text.slice(0, 4000),
      voice: VOICE,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    console.error("TTS failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  return new Uint8Array(await res.arrayBuffer());
}

function narrationFor(slide: Slide): string {
  if (slide.narration && slide.narration.trim()) return slide.narration.trim();
  const parts: string[] = [];
  if (slide.heading) parts.push(slide.heading);
  if (slide.bullets?.length) parts.push(slide.bullets.join(". "));
  if (slide.example) parts.push("For example: " + slide.example);
  return parts.join(". ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Admin gate via profiles.role
    const { data: profile } = await admin.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    if (profile?.role !== "school_admin" && profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { lesson_id, force = false } = body as { lesson_id?: string; force?: boolean };

    if (!lesson_id) {
      return new Response(JSON.stringify({ error: "lesson_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0, skipped = 0, failed = 0;

    for (const vak of VAKS) {
      const { data: variant } = await admin
        .from("prebuilt_lesson_variants")
        .select("id, content")
        .eq("lesson_id", lesson_id)
        .eq("vak_style", vak)
        .maybeSingle();

      if (!variant?.content) continue;
      const slides: Slide[] = (variant.content as any).slides ?? [];
      let dirty = false;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (slide.audio_url && !force) { skipped++; continue; }
        const text = narrationFor(slide);
        if (!text) { skipped++; continue; }

        const audio = await synthesize(text, apiKey);
        if (!audio) { failed++; continue; }

        const path = `prebuilt-lessons/${lesson_id}/${vak}_${i}.mp3`;
        const { error: upErr } = await admin.storage.from(BUCKET).upload(path, audio, {
          contentType: "audio/mpeg", upsert: true,
        });
        if (upErr) { console.error("upload err", upErr); failed++; continue; }

        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
        slides[i] = { ...slide, audio_url: pub.publicUrl };
        dirty = true;
        generated++;
      }

      if (dirty) {
        await admin
          .from("prebuilt_lesson_variants")
          .update({ content: { ...(variant.content as any), slides } })
          .eq("id", variant.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, lesson_id, generated, skipped, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-audio error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
