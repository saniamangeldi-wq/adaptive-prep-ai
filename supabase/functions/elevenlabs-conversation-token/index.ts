import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ElevenLabsErrorInfo = {
  code: string;
  message: string;
  providerStatus?: string;
};

const parseElevenLabsError = async (
  response: Response,
  requestType: "token" | "signed_url"
): Promise<ElevenLabsErrorInfo> => {
  const errorText = await response.text();
  console.error(`ElevenLabs ${requestType} error:`, response.status, errorText);

  try {
    const parsed = JSON.parse(errorText);
    const providerStatus = parsed?.detail?.status;
    const providerMessage = parsed?.detail?.message;

    if (
      providerStatus === "missing_permissions" &&
      typeof providerMessage === "string" &&
      providerMessage.includes("convai_write")
    ) {
      return {
        code: "elevenlabs_missing_convai_write",
        message:
          "ElevenLabs API key is missing the convai_write permission required for voice chat. Update the key permissions in your ElevenLabs connector, then try again.",
        providerStatus,
      };
    }

    if (typeof providerMessage === "string" && providerMessage.trim().length > 0) {
      return {
        code: `elevenlabs_${requestType}_failed`,
        message: providerMessage,
        providerStatus,
      };
    }
  } catch {
    // Fall through to generic error below.
  }

  return {
    code: `elevenlabs_${requestType}_failed`,
    message: `ElevenLabs ${requestType} request failed with status ${response.status}.`,
  };
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, learning_style")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.tier !== "tier_3") {
      return new Response(JSON.stringify({ error: "Voice chat requires Elite tier subscription" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!ELEVENLABS_AGENT_ID) {
      return new Response(JSON.stringify({ error: "ElevenLabs Agent ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [tokenResponse, signedUrlResponse] = await Promise.all([
      fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`, {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }),
      fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`, {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }),
    ]);

    let token: string | null = null;
    let tokenError: ElevenLabsErrorInfo | null = null;
    if (tokenResponse.ok) {
      const tokenJson = await tokenResponse.json();
      token = tokenJson?.token ?? null;
    } else {
      tokenError = await parseElevenLabsError(tokenResponse, "token");
    }

    let signedUrl: string | null = null;
    let signedUrlError: ElevenLabsErrorInfo | null = null;
    if (signedUrlResponse.ok) {
      const signedUrlJson = await signedUrlResponse.json();
      signedUrl = signedUrlJson?.signed_url ?? null;
    } else {
      signedUrlError = await parseElevenLabsError(signedUrlResponse, "signed_url");
    }

    if (!token && !signedUrl) {
      const primaryError = tokenError ?? signedUrlError;
      const isPermissionError = primaryError?.code === "elevenlabs_missing_convai_write";

      return new Response(
        JSON.stringify({
          error: primaryError?.message ?? "Failed to initialize voice session",
          code: primaryError?.code ?? "voice_session_initialization_failed",
        }),
        {
          status: isPermissionError ? 502 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        token,
        signedUrl,
        learningStyle: profile.learning_style,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("elevenlabs-conversation-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
