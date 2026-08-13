import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

const monthKey = () => new Date().toISOString().slice(0, 7);

async function getQuota(userId: string) {
  const admin = adminClient();
  const { data: profile } = await admin
    .from('profiles').select('tier').eq('user_id', userId).maybeSingle();
  if (!profile) return null;
  const limitSeconds = profile.tier === 'tier_3' ? 200 * 60 : 5 * 60;
  const { data: usage } = await admin
    .from('voice_usage').select('seconds_used')
    .eq('user_id', userId).eq('month_year', monthKey()).maybeSingle();
  return { limitSeconds, used: usage?.seconds_used ?? 0 };
}

async function recordUsage(userId: string, seconds: number) {
  const admin = adminClient();
  const month = monthKey();
  const { data: existing } = await admin
    .from('voice_usage').select('id, seconds_used')
    .eq('user_id', userId).eq('month_year', month).maybeSingle();
  if (existing) {
    await admin.from('voice_usage')
      .update({ seconds_used: existing.seconds_used + seconds, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await admin.from('voice_usage')
      .insert({ user_id: userId, seconds_used: seconds, month_year: month });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const quota = await getQuota(user.id);
  if (!quota) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (quota.used >= quota.limitSeconds) {
    return new Response(JSON.stringify({ error: 'Voice minutes exhausted for this month' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voice = 'alloy', speed = 1.0 } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const capped = text.slice(0, 4000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        input: capped,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`TTS gateway failed [${response.status}]: ${errorBody}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please wait a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Speech generation failed', details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audio = await response.arrayBuffer();
    // ~15 chars/sec of speech, adjusted for playback speed
    const estimatedSeconds = Math.max(1, Math.ceil(capped.length / 15 / (Number(speed) || 1)));
    await recordUsage(user.id, estimatedSeconds);
    return new Response(audio, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
    });

  } catch (err) {
    console.error('voice-speak error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
