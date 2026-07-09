import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accept the incoming multipart body directly and forward to Lovable AI Gateway STT.
    const inFormData = await req.formData();
    const file = inFormData.get('file');
    if (!(file instanceof File) && !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'Missing audio file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic guard: reject empty / tiny recordings
    if (file.size < 1024) {
      return new Response(JSON.stringify({ error: 'Recording is too short. Please try again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Choose a filename with the right extension from the MIME type
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
