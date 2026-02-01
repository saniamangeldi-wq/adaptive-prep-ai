import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { student_id } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: "student_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student's portfolio
    const { data: portfolio } = await supabase
      .from("student_portfolios")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle();

    // Get student's preferences
    const { data: preferences } = await supabase
      .from("university_preferences")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle();

    // Get all universities
    const { data: universities, error: uniError } = await supabase
      .from("university_database")
      .select("*");

    if (uniError || !universities || universities.length === 0) {
      return new Response(
        JSON.stringify({ error: "No universities available", details: uniError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate match scores for each university
    const matches = universities.map(university => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Location match
      if (preferences?.preferred_countries?.length > 0) {
        if (preferences.preferred_countries.includes(university.country)) {
          score += 15;
          reasons.push(`Located in ${university.country}, one of your preferred countries`);
        } else {
          score -= 10;
        }
      }

      // Climate match
      if (preferences?.climate_preference && university.climate) {
        if (preferences.climate_preference.toLowerCase().includes(university.climate.toLowerCase()) ||
            preferences.climate_preference === "No preference") {
          score += 5;
        }
      }

      // Location type match
      if (preferences?.social_life_preference && university.location_type) {
        if (preferences.social_life_preference.toLowerCase().includes("urban") && 
            university.location_type.toLowerCase() === "urban") {
          score += 8;
          reasons.push("Urban campus matches your social life preference");
        }
        if (preferences.social_life_preference.toLowerCase().includes("rural") && 
            university.location_type.toLowerCase() === "rural") {
          score += 8;
        }
      }

      // Financial fit
      if (preferences?.scholarship_need) {
        const needsFullScholarship = preferences.scholarship_need.includes("Full");
        const universityHasScholarships = university.scholarship_types && 
          (university.scholarship_types as any[]).length > 0;
        
        if (universityHasScholarships) {
          score += 10;
          reasons.push("Offers scholarships matching your financial needs");
        } else if (needsFullScholarship) {
          score -= 15;
        }
      }

      // Fields of interest match
      if (preferences?.fields_of_interest?.length > 0 && university.programs?.length > 0) {
        const matchingPrograms = preferences.fields_of_interest.filter((field: string) =>
          university.programs.some((prog: string) => 
            prog.toLowerCase().includes(field.toLowerCase().split(" ")[0])
          )
        );
        
        if (matchingPrograms.length > 0) {
          score += 15;
          reasons.push(`Offers programs in ${matchingPrograms.join(", ")}`);
        }
      }

      // Size preference
      if (preferences?.university_size && university.student_population) {
        const pop = university.student_population;
        const sizePref = preferences.university_size;
        
        if ((sizePref.includes("Small") && pop < 5000) ||
            (sizePref.includes("Medium") && pop >= 5000 && pop < 15000) ||
            (sizePref.includes("Large") && pop >= 15000 && pop < 30000) ||
            (sizePref.includes("Very large") && pop >= 30000) ||
            sizePref === "No preference") {
          score += 5;
        }
      }

      // Ranking preference
      if (preferences?.ranking_importance && university.ranking_global) {
        if (preferences.ranking_importance.includes("top 50") && university.ranking_global <= 50) {
          score += 15;
          reasons.push(`Ranked #${university.ranking_global} globally`);
        } else if (preferences.ranking_importance.includes("100-200") && university.ranking_global <= 200) {
          score += 10;
        }
      }

      // Cap score at 100
      score = Math.min(100, Math.max(0, score));

      return {
        university_id: university.id,
        match_score: score,
        match_reason: reasons.length > 0 
          ? reasons.join(". ") + "."
          : `${university.name} is a solid match based on your profile.`,
        financial_estimate: {
          tuition_estimate: university.tuition_usd,
          living_cost: university.living_cost_monthly ? university.living_cost_monthly * 12 : null,
          scholarship_available: (university.scholarship_types as any[])?.length > 0
        }
      };
    });

    // Sort by score and take top 15
    const topMatches = matches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 15);

    // Delete existing matches for this student
    await supabase
      .from("student_university_matches")
      .delete()
      .eq("student_id", student_id);

    // Insert new matches
    const matchInserts = topMatches.map(match => ({
      student_id,
      university_id: match.university_id,
      match_score: match.match_score,
      match_reason: match.match_reason,
      financial_estimate: match.financial_estimate,
      saved: false
    }));

    const { error: insertError } = await supabase
      .from("student_university_matches")
      .insert(matchInserts);

    if (insertError) {
      console.error("Error inserting matches:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save matches", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches_generated: topMatches.length,
        top_score: topMatches[0]?.match_score 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("University matcher error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
