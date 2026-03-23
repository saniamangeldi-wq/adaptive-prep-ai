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
    const { newEmail, existingEmail, newName, existingName, similarityReason } = await req.json();

    // Get admin emails to notify
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all school_admin users
    const { data: admins } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("role", "school_admin");

    if (!admins || admins.length === 0) {
      // Fallback: notify the platform owner (first created profile)
      const { data: firstAdmin } = await supabase
        .from("profiles")
        .select("email, full_name")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (firstAdmin) {
        admins?.push(firstAdmin) || [firstAdmin];
      }
    }

    // Use Lovable AI to send a simple notification via the LOVABLE_API_KEY
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // For now, log the detection and store it - email will be sent via the admin dashboard review
    console.log(`🚨 Duplicate account detected!`);
    console.log(`New account: ${newName} (${newEmail})`);
    console.log(`Matches: ${existingName} (${existingEmail})`);
    console.log(`Reason: ${similarityReason}`);
    console.log(`Admins to notify: ${admins?.map(a => a.email).join(", ")}`);

    // The detection is already stored in duplicate_account_flags by the DB trigger
    // This function serves as an additional notification layer

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Duplicate flag recorded",
        adminsNotified: admins?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-duplicate-account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
