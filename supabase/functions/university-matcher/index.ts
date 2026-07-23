import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// -------------------- helpers --------------------

function parseSatRange(text: string | null | undefined): { p25: number | null; p75: number | null } {
  if (!text || typeof text !== "string") return { p25: null, p75: null };
  const m = text.match(/(\d{3,4})\s*[-–—to]+\s*(\d{3,4})/i);
  if (!m) return { p25: null, p75: null };
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (!isFinite(a) || !isFinite(b)) return { p25: null, p75: null };
  return { p25: Math.min(a, b), p75: Math.max(a, b) };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

type AdmitOutcome = {
  probability: number | null; // 0..1, null when unknown
  bucket: "safety" | "target" | "reach" | "unknown";
  explanation: string;
};

function estimateAdmit(
  uni: any,
  studentSat: number | null
): AdmitOutcome {
  const acceptRate: number | null =
    typeof uni.acceptance_rate === "number" ? uni.acceptance_rate : null;

  if (acceptRate == null || acceptRate <= 0) {
    return {
      probability: null,
      bucket: "unknown",
      explanation: "Admissions data unavailable — outlook cannot be estimated.",
    };
  }

  const baseline = clamp(acceptRate / 100, 0.01, 0.99);

  // Prefer numeric columns; fall back to the free-text sat_range.
  const numericP25 = typeof uni.sat_p25 === "number" ? uni.sat_p25 : null;
  const numericP75 = typeof uni.sat_p75 === "number" ? uni.sat_p75 : null;
  const parsed = (numericP25 == null || numericP75 == null) ? parseSatRange(uni.sat_range) : { p25: null, p75: null };
  const effectiveP25 = numericP25 ?? parsed.p25;
  const effectiveP75 = numericP75 ?? parsed.p75;

  const { p25, p75 } = parseSatRange(uni.sat_range);
  const effectiveP25 = p25;
  const effectiveP75 = p75;
  const avg = typeof uni.avg_sat_score === "number" ? uni.avg_sat_score : null;

  let adjusted = baseline;
  let satNote = "";

  if (studentSat && (effectiveP25 || effectiveP75 || avg)) {
    if (effectiveP25 && effectiveP75) {
      if (studentSat > effectiveP75) {
        adjusted = Math.min(0.95, baseline * 1.6);
        satNote = `your SAT ${studentSat} is above their middle-50% of ${effectiveP25}–${effectiveP75}`;
      } else if (studentSat >= effectiveP25) {
        adjusted = baseline * 1.0;
        satNote = `your SAT ${studentSat} is within their middle-50% of ${effectiveP25}–${effectiveP75}`;
      } else {
        adjusted = Math.max(0.01, baseline * 0.4);
        satNote = `your SAT ${studentSat} is below their middle-50% of ${effectiveP25}–${effectiveP75}`;
      }
    } else if (avg) {
      if (studentSat >= avg + 60) {
        adjusted = Math.min(0.95, baseline * 1.6);
        satNote = `your SAT ${studentSat} is well above the avg ${avg}`;
      } else if (studentSat >= avg - 60) {
        adjusted = baseline;
        satNote = `your SAT ${studentSat} is near the avg ${avg}`;
      } else {
        adjusted = Math.max(0.01, baseline * 0.4);
        satNote = `your SAT ${studentSat} is below the avg ${avg}`;
      }
    }
  } else if (!studentSat && (effectiveP25 || avg)) {
    satNote = "no SAT on file — using base acceptance rate only";
  } else {
    satNote = "no SAT benchmarks available for this school — using base acceptance rate only";
  }

  adjusted = clamp(adjusted, 0.01, 0.95);

  const bucket: AdmitOutcome["bucket"] =
    adjusted >= 0.6 ? "safety" : adjusted >= 0.25 ? "target" : "reach";

  const label = bucket === "safety" ? "Safety" : bucket === "target" ? "Target" : "Reach";
  const explanation = `${label}: ${satNote}; ~${Math.round(adjusted * 100)}% estimated chance (base acceptance ${acceptRate}%).`;

  return { probability: adjusted, bucket, explanation };
}

// Preference fit scoring, normalized to 0..100. NO ranking bias.
function computeFit(uni: any, prefs: any, fieldsFromPortfolio: string[]): { score: number; reasons: string[] } {
  let raw = 0;
  let max = 0;
  const reasons: string[] = [];

  // Country (weight 20)
  max += 20;
  if (prefs?.preferred_countries?.length) {
    if (prefs.preferred_countries.includes(uni.country)) {
      raw += 20;
      reasons.push(`Located in ${uni.country}`);
    }
  } else {
    raw += 12; // no preference: neutral partial credit
  }

  // Climate (weight 8)
  max += 8;
  if (prefs?.climate_preference && uni.climate) {
    if (
      prefs.climate_preference === "No preference" ||
      prefs.climate_preference.toLowerCase().includes(String(uni.climate).toLowerCase())
    ) {
      raw += 8;
    }
  } else {
    raw += 5;
  }

  // Urban/rural (weight 10)
  max += 10;
  if (prefs?.social_life_preference && uni.location_type) {
    const p = String(prefs.social_life_preference).toLowerCase();
    const l = String(uni.location_type).toLowerCase();
    if ((p.includes("urban") && l === "urban") || (p.includes("rural") && l === "rural") || (p.includes("suburb") && l.includes("suburb"))) {
      raw += 10;
      reasons.push(`${uni.location_type} campus matches your setting preference`);
    } else {
      raw += 3;
    }
  } else {
    raw += 6;
  }

  // Scholarships / financial fit (weight 18)
  max += 18;
  const needsFull = String(prefs?.scholarship_need || "").toLowerCase().includes("full");
  const hasScholarships = (Array.isArray(uni.scholarship_types) && uni.scholarship_types.length > 0) || !!uni.offers_full_scholarship;
  if (hasScholarships) {
    raw += 18;
    reasons.push("Offers scholarships matching your financial needs");
  } else if (needsFull) {
    raw += 0;
  } else {
    raw += 10;
  }

  // Fields / programs (weight 24)
  max += 24;
  const wantedFields: string[] = [
    ...((prefs?.fields_of_interest as string[]) || []),
    ...fieldsFromPortfolio,
  ].filter(Boolean);
  const programs: string[] = Array.isArray(uni.programs) ? uni.programs : [];
  const popular: string[] = Array.isArray(uni.popular_majors) ? uni.popular_majors : [];
  if (wantedFields.length && (programs.length || popular.length)) {
    const matched = wantedFields.filter((f) =>
      [...programs, ...popular].some((p: string) =>
        String(p).toLowerCase().includes(String(f).toLowerCase().split(" ")[0])
      )
    );
    if (matched.length) {
      raw += 24;
      reasons.push(`Offers programs in ${matched.slice(0, 3).join(", ")}`);
    } else {
      raw += 4;
    }
  } else {
    raw += 12;
  }

  // Size (weight 10)
  max += 10;
  if (prefs?.university_size && uni.student_population) {
    const pop = uni.student_population;
    const sp = String(prefs.university_size);
    const ok =
      (sp.includes("Small") && pop < 5000) ||
      (sp.includes("Medium") && pop >= 5000 && pop < 15000) ||
      (sp.includes("Large") && pop >= 15000 && pop < 30000) ||
      (sp.includes("Very large") && pop >= 30000) ||
      sp === "No preference";
    raw += ok ? 10 : 3;
  } else {
    raw += 6;
  }

  // Language (weight 10) — soft
  max += 10;
  const langs = Array.isArray(uni.language_of_instruction) ? uni.language_of_instruction : [];
  if (langs.length === 0 || langs.some((l: string) => String(l).toLowerCase().includes("english"))) {
    raw += 10;
  } else {
    raw += 4;
  }

  const score = Math.round((raw / max) * 100);
  return { score: clamp(score, 0, 100), reasons };
}

// -------------------- handler --------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const student_id = user.id;

    const [portfolioRes, prefsRes, profileRes, universitiesRes] = await Promise.all([
      supabase.from("student_portfolios").select("*").eq("student_id", student_id).maybeSingle(),
      supabase.from("university_preferences").select("*").eq("student_id", student_id).maybeSingle(),
      supabase.from("profiles").select("target_sat_score, study_subjects").eq("user_id", student_id).maybeSingle(),
      supabase.from("university_database").select("*"),
    ]);

    const portfolio = portfolioRes.data;
    const preferences = prefsRes.data;
    const profile = profileRes.data;
    const universities = universitiesRes.data;

    if (universitiesRes.error || !universities || universities.length === 0) {
      return new Response(
        JSON.stringify({ error: "No universities available", details: universitiesRes.error }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive student SAT: prefer extracted portfolio.sat, then best real full-length test attempt, then target_sat_score.
    let studentSat: number | null = null;
    const extracted = (portfolio?.extracted_data as any) || {};
    if (typeof extracted?.sat_total === "number") studentSat = extracted.sat_total;
    else if (typeof extracted?.sat === "number") studentSat = extracted.sat;

    if (!studentSat) {
      // Try best recent SAT full-test attempt: raw score column stores scaled score for full tests in this app.
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("score, sat_tests!inner(test_type)")
        .eq("user_id", student_id)
        .order("completed_at", { ascending: false })
        .limit(20);
      if (attempts?.length) {
        const best = attempts
          .map((a: any) => Number(a.score))
          .filter((n) => isFinite(n) && n >= 400 && n <= 1600);
        if (best.length) studentSat = Math.max(...best);
      }
    }

    if (!studentSat && profile?.target_sat_score) {
      // Fall back to target (student's goal); label it clearly as target when used
      // We still use it because it's directional; the note wording is handled inside admit explanation via general phrasing.
      studentSat = profile.target_sat_score;
    }

    const studySubjects: string[] = Array.isArray(profile?.study_subjects)
      ? (profile!.study_subjects as string[])
      : [];

    // Compute both scores per university
    const enriched = universities.map((uni: any) => {
      const fit = computeFit(uni, preferences, studySubjects);
      const admit = estimateAdmit(uni, studentSat);
      return { uni, fit, admit };
    });

    const FIT_MIN = 55;

    // Build balanced shortlist
    const buckets = {
      safety: [] as typeof enriched,
      target: [] as typeof enriched,
      reach: [] as typeof enriched,
      unknown: [] as typeof enriched,
    };
    for (const e of enriched) buckets[e.admit.bucket].push(e);

    const sortByFit = (arr: typeof enriched) =>
      arr.sort((a, b) => b.fit.score - a.fit.score);
    sortByFit(buckets.safety);
    sortByFit(buckets.target);
    sortByFit(buckets.reach);
    sortByFit(buckets.unknown);

    const takeAboveFit = (arr: typeof enriched, n: number, used: Set<string>) => {
      const out: typeof enriched = [];
      for (const e of arr) {
        if (out.length >= n) break;
        if (used.has(e.uni.id)) continue;
        if (e.fit.score < FIT_MIN) continue;
        out.push(e);
        used.add(e.uni.id);
      }
      return out;
    };

    const used = new Set<string>();
    let pickSafety = takeAboveFit(buckets.safety, 4, used);
    let pickTarget = takeAboveFit(buckets.target, 6, used);
    let pickReach = takeAboveFit(buckets.reach, 4, used);

    // Fill shortfalls from other buckets (still above fit min), then unknowns.
    const TARGET_TOTAL = 14;
    const shortlist = [...pickSafety, ...pickTarget, ...pickReach];

    const fillers = [
      ...buckets.target,
      ...buckets.safety,
      ...buckets.reach,
      ...buckets.unknown,
    ];
    for (const e of fillers) {
      if (shortlist.length >= TARGET_TOTAL) break;
      if (used.has(e.uni.id)) continue;
      if (e.fit.score < FIT_MIN - 10) continue; // relax slightly when filling
      shortlist.push(e);
      used.add(e.uni.id);
    }

    // As a final fallback, if still empty (very sparse data), take best-fit overall.
    if (shortlist.length === 0) {
      const fallback = [...enriched].sort((a, b) => b.fit.score - a.fit.score).slice(0, 12);
      shortlist.push(...fallback);
    }

    // Sort final list: Safety → Target → Reach → Unknown, then fit desc within.
    const bucketOrder: Record<string, number> = { safety: 0, target: 1, reach: 2, unknown: 3 };
    shortlist.sort((a, b) => {
      const ba = bucketOrder[a.admit.bucket] ?? 9;
      const bb = bucketOrder[b.admit.bucket] ?? 9;
      if (ba !== bb) return ba - bb;
      return b.fit.score - a.fit.score;
    });

    // Delete existing matches, insert new ones
    await supabase.from("student_university_matches").delete().eq("student_id", student_id);

    const inserts = shortlist.map((e) => {
      const preferenceReason = e.fit.reasons.length
        ? e.fit.reasons.join(". ") + "."
        : "General profile fit.";
      const combined = `${preferenceReason} ${e.admit.explanation}`;
      return {
        student_id,
        university_id: e.uni.id,
        match_score: e.fit.score, // keep for backward-compat sort
        fit_score: e.fit.score,
        admit_probability: e.admit.probability,
        admit_bucket: e.admit.bucket,
        match_reason: combined,
        financial_estimate: {
          tuition_estimate: e.uni.tuition_usd,
          living_cost: e.uni.living_cost_monthly ? e.uni.living_cost_monthly * 12 : null,
          scholarship_available:
            (Array.isArray(e.uni.scholarship_types) && e.uni.scholarship_types.length > 0) ||
            !!e.uni.offers_full_scholarship,
        },
        saved: false,
      };
    });

    const { error: insertError } = await supabase
      .from("student_university_matches")
      .insert(inserts);

    if (insertError) {
      console.error("insert error", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save matches", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        student_sat_used: studentSat,
        counts: {
          total: inserts.length,
          safety: inserts.filter((i) => i.admit_bucket === "safety").length,
          target: inserts.filter((i) => i.admit_bucket === "target").length,
          reach: inserts.filter((i) => i.admit_bucket === "reach").length,
          unknown: inserts.filter((i) => i.admit_bucket === "unknown").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("university-matcher error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
