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

    const inFormData = await req.formData();
    const file = inFormData.get('file');
    if (!(file instanceof File) && !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'Missing audio file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (file.size < 1024) {
      return new Response(JSON.stringify({ error: 'Recording is too short. Please try again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mime = (file.type || '').split(';')[0];
    const extMap: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
    };
    const ext = extMap[mime] ?? 'wav';
    const filename = (file instanceof File && file.name) ? file.name : `recording.${ext}`;

    const upstream = new FormData();
    upstream.append('model', 'openai/gpt-4o-transcribe');
    upstream.append('file', file, filename);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`STT gateway failed [${response.status}]: ${errorBody}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Please wait a moment and try again.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits or upgrade the workspace plan.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Transcription failed', details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    // Estimate duration from encoded audio size (~4 KB/s for typical compressed speech)
    const estimatedSeconds = Math.min(600, Math.max(1, Math.ceil(file.size / 4000)));
    await recordUsage(user.id, estimatedSeconds);
    return new Response(JSON.stringify({ text: data.text ?? '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('voice-transcribe error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
