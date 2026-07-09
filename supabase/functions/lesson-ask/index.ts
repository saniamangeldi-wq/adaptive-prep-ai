import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Context-aware Q&A for a student watching a video lesson.
// Body: { question: string, currentSlide: { heading, narration, bullets? }, deepDive?: boolean, fullLessonContext?: string, lessonTitle?: string, vakStyle?: string }
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

    const vakHint =
      vakStyle === 'visual' ? 'Use vivid visual analogies.' :
      vakStyle === 'auditory' ? 'Use rhythmic, conversational phrasing.' :
      vakStyle === 'kinesthetic' ? 'Use action-oriented, hands-on framing.' :
      vakStyle === 'reading_writing' ? 'Use precise written explanations and structure.' :
      '';

    const slideContext = currentSlide
      ? `Current slide heading: ${currentSlide.heading}\nNarration: ${currentSlide.narration ?? ''}\nBullets: ${(currentSlide.bullets ?? []).join(' | ')}`
      : '';

    const systemPrompt = deepDive
      ? `You are an AdaptivePrep tutor answering a student's question while they watch the lesson "${lessonTitle ?? ''}". Give a thorough, connected explanation that references earlier parts of the lesson when helpful. ${vakHint} Keep it under 180 words. Never invent facts outside the lesson context.`
      : `You are an AdaptivePrep tutor answering a student's quick question during a video lesson. Answer briefly (2-4 sentences) focused ONLY on the current slide. ${vakHint} If the answer needs earlier lesson context, tell them to tap 'Dig deeper'.`;

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
