import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Context-aware Q&A for a student watching a video lesson.
// Body: { question, currentSlide, deepDive?, fullLessonContext?, lessonTitle?, vakStyle? }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      question,
      currentSlide,
      deepDive = false,
      fullLessonContext,
      lessonTitle,
      vakStyle,
    } = await req.json();

    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Missing question' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read user's preferred language (optional — default English)
    let langCode: string = 'en';
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.preferred_language) langCode = profile.preferred_language;
        }
      } catch (e) {
        console.error('lesson-ask: could not load preferred_language', e);
      }
    }
    const langName = langCode === 'ru' ? 'Russian (Русский)' : langCode === 'kk' ? 'Kazakh (Қазақша)' : 'English';

    const vakHint =
      vakStyle === 'visual' ? 'Use vivid visual analogies.' :
      vakStyle === 'auditory' ? 'Use rhythmic, conversational phrasing.' :
      vakStyle === 'kinesthetic' ? 'Use action-oriented, hands-on framing.' :
      vakStyle === 'reading_writing' ? 'Use precise written explanations and structure.' :
      '';

    const slideContext = currentSlide
      ? `Current slide heading: ${currentSlide.heading}\nNarration: ${currentSlide.narration ?? ''}\nBullets: ${(currentSlide.bullets ?? []).join(' | ')}`
      : '';

    const languageInstruction = ` IMPORTANT: Respond ONLY in ${langName}. Keep subject-specific terms (SAT, math notation, chemical symbols, proper nouns) as-is, but write everything else in ${langName}.`;

    const systemPrompt = deepDive
      ? `You are an AdaptivePrep tutor answering a student's question while they watch the lesson "${lessonTitle ?? ''}". Give a thorough, connected explanation that references earlier parts of the lesson when helpful. ${vakHint} Keep it under 180 words. Never invent facts outside the lesson context.${languageInstruction}`
      : `You are an AdaptivePrep tutor answering a student's quick question during a video lesson. Answer briefly (2-4 sentences) focused ONLY on the current slide. ${vakHint} If the answer needs earlier lesson context, tell them to tap 'Dig deeper'.${languageInstruction}`;

    const userContent = deepDive && fullLessonContext
      ? `FULL LESSON CONTEXT:\n${fullLessonContext.slice(0, 8000)}\n\nCURRENT SLIDE:\n${slideContext}\n\nSTUDENT QUESTION: ${question}`
      : `CURRENT SLIDE:\n${slideContext}\n\nSTUDENT QUESTION: ${question}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`lesson-ask gateway failed [${response.status}]: ${errorBody}`);
      return new Response(JSON.stringify({ error: 'AI request failed', details: errorBody }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('lesson-ask error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
