import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lesson_id, section_index, voice_id } = await req.json();

    if (!lesson_id) {
      return new Response(
        JSON.stringify({ error: "lesson_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("video_lessons")
      .select("*")
      .eq("id", lesson_id)
      .eq("user_id", user.id)
      .single();

    if (lessonError || !lesson) {
      return new Response(
        JSON.stringify({ error: "Lesson not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scriptContent = JSON.parse(lesson.script_content);
    const sections = scriptContent.sections || [];

    if (sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lesson has no sections" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Educational voice - Sarah (warm, clear, educational)
    const selectedVoiceId = voice_id || "EXAVITQu4vr4xnSDxMaL";

    // If section_index is provided, narrate only that section
    // Otherwise, narrate all sections and return metadata
    const sectionsToNarrate =
      section_index !== undefined && section_index !== null
        ? [{ ...sections[section_index], index: section_index }]
        : sections.map((s: any, i: number) => ({ ...s, index: i }));

    const results = [];

    for (const section of sectionsToNarrate) {
      const narrationText = section.narration;
      if (!narrationText || narrationText.trim().length === 0) continue;

      // Use request stitching for natural flow between sections
      const previousSection =
        section.index > 0 ? sections[section.index - 1]?.narration?.slice(-200) : undefined;
      const nextSection =
        section.index < sections.length - 1
          ? sections[section.index + 1]?.narration?.slice(0, 200)
          : undefined;

      const ttsBody: any = {
        text: narrationText.slice(0, 5000),
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
          speed: 0.95,
        },
      };

      if (previousSection) ttsBody.previous_text = previousSection;
      if (nextSection) ttsBody.next_text = nextSection;

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ttsBody),
        }
      );

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        console.error(`TTS error for section ${section.index}:`, ttsResponse.status, errText);
        results.push({
          section_index: section.index,
          section_title: section.section_title,
          status: "failed",
          error: `TTS generation failed: ${ttsResponse.status}`,
        });
        continue;
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = base64Encode(audioBuffer);

      // Upload to storage
      const fileName = `${user.id}/${lesson_id}/section_${section.index}.mp3`;
      const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const { error: uploadError } = await serviceSupabase.storage
        .from("generated-documents")
        .upload(fileName, new Uint8Array(audioBuffer), {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for section ${section.index}:`, uploadError);
      }

      const { data: urlData } = serviceSupabase.storage
        .from("generated-documents")
        .getPublicUrl(fileName);

      results.push({
        section_index: section.index,
        section_title: section.section_title,
        status: "completed",
        audio_url: urlData?.publicUrl || null,
        audio_base64: audioBase64,
        duration_estimate: section.duration_estimate_seconds,
      });
    }

    // Update lesson status
    const allCompleted = results.every((r) => r.status === "completed");
    if (allCompleted && section_index === undefined) {
      await supabase
        .from("video_lessons")
        .update({
          status: "narrated",
          audio_url: results[0]?.audio_url || null,
        })
        .eq("id", lesson_id);
    }

    return new Response(
      JSON.stringify({
        lesson_id,
        sections: results,
        status: allCompleted ? "narrated" : "partial",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("narrate-lesson error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
