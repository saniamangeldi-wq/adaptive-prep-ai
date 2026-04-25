import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const BUCKET = "generated-documents";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lesson_id, section_index, text, voice_id } = await req.json();
    if (!lesson_id || section_index === undefined || section_index === null || !text) {
      return new Response(
        JSON.stringify({ error: "lesson_id, section_index, and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voiceId = voice_id || DEFAULT_VOICE;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Cache check
    const { data: cached } = await admin
      .from("verbal_lesson_audio")
      .select("audio_url, text_hash")
      .eq("lesson_id", lesson_id)
      .eq("section_index", section_index)
      .eq("voice_id", voiceId)
      .maybeSingle();

    const hash = await sha256(text);

    if (cached && cached.text_hash === hash) {
      return new Response(
        JSON.stringify({ audio_url: cached.audio_url, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Generate via ElevenLabs
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "TTS not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("ElevenLabs error", ttsRes.status, errText);
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuf = await ttsRes.arrayBuffer();

    // 3. Upload to public bucket
    const path = `verbal-lessons/${lesson_id}/section_${section_index}_${voiceId}.mp3`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(audioBuf), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (upErr) {
      console.error("Upload error:", upErr);
      return new Response(JSON.stringify({ error: "Storage upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    // 4. Persist cache row (upsert)
    await admin
      .from("verbal_lesson_audio")
      .upsert(
        {
          lesson_id,
          section_index,
          text_hash: hash,
          voice_id: voiceId,
          audio_url: audioUrl,
          storage_path: path,
        },
        { onConflict: "lesson_id,section_index,voice_id" }
      );

    return new Response(
      JSON.stringify({ audio_url: audioUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verbal-lesson-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
