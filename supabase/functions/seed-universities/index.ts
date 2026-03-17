import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEED_QUERIES = [
  {
    query: `List the top 100 universities in QS World Rankings 2025. For each university provide: name, country, city, acceptance_rate (number), tuition_usd (annual integer), qs_rank (integer 1-100), offers_full_scholarship (boolean), scholarship_name (if applicable), scholarship_coverage, popular_majors (array of strings), student_population (integer), international_student_pct (number), campus_setting (Urban/Suburban/Rural), sat_range, ielts_min, toefl_min, website_url. Return ONLY a valid JSON array, no explanation.`,
    label: "Top 100 QS"
  },
  {
    query: `List QS World Rankings 101-200 universities 2025. For each: name, country, city, acceptance_rate, tuition_usd, qs_rank (101-200), offers_full_scholarship, scholarship_name, scholarship_coverage, popular_majors, student_population, international_student_pct, campus_setting, sat_range, ielts_min, toefl_min, website_url. Return ONLY a valid JSON array.`,
    label: "QS 101-200"
  },
  {
    query: `List QS World Rankings 201-300 universities 2025. For each: name, country, city, acceptance_rate, tuition_usd, qs_rank (201-300), offers_full_scholarship, scholarship_name, scholarship_coverage, popular_majors, student_population, international_student_pct, campus_setting, website_url. Return ONLY a valid JSON array.`,
    label: "QS 201-300"
  },
  {
    query: `List QS World Rankings 301-400 universities 2025. For each: name, country, city, acceptance_rate, tuition_usd, qs_rank (301-400), offers_full_scholarship, scholarship_name, scholarship_coverage, popular_majors, student_population, campus_setting, website_url. Return ONLY a valid JSON array.`,
    label: "QS 301-400"
  },
  {
    query: `List QS World Rankings 401-500 universities 2025. For each: name, country, city, acceptance_rate, tuition_usd, qs_rank (401-500), offers_full_scholarship, scholarship_name, scholarship_coverage, popular_majors, student_population, campus_setting, website_url. Return ONLY a valid JSON array.`,
    label: "QS 401-500"
  },
  {
    query: `List 50 universities worldwide NOT in QS top 500 that are well known for offering full scholarships or full financial aid to international students. For each: name, country, city, acceptance_rate, tuition_usd, offers_full_scholarship (true), scholarship_name, scholarship_coverage, scholarship_open_to, scholarship_deadline, popular_majors, student_population, campus_setting, website_url. Return ONLY a valid JSON array.`,
    label: "Scholarship specialists"
  },
];

function extractJSON(text: string): any[] {
  // Try to find JSON array in the response
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // Try fixing common issues
      const cleaned = match[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');
      try {
        return JSON.parse(cleaned);
      } catch {
        return [];
      }
    }
  }
  return [];
}

function mapToRow(item: any, batchIndex: number) {
  return {
    name: item.name || item.university_name || 'Unknown',
    country: item.country || 'Unknown',
    city: item.city || null,
    qs_rank: item.qs_rank || null,
    acceptance_rate: item.acceptance_rate || null,
    acceptance_rate_label: item.acceptance_rate
      ? item.acceptance_rate < 10 ? 'Very Selective'
        : item.acceptance_rate < 30 ? 'Selective'
        : 'Accessible'
      : null,
    tuition_usd: item.tuition_usd || null,
    offers_full_scholarship: item.offers_full_scholarship || false,
    scholarship_name: item.scholarship_name || null,
    scholarship_coverage: item.scholarship_coverage || null,
    scholarship_url: item.scholarship_url || null,
    scholarship_open_to: item.scholarship_open_to || null,
    scholarship_deadline: item.scholarship_deadline || null,
    popular_majors: item.popular_majors || null,
    programs: item.popular_majors || null,
    student_population: item.student_population || null,
    international_student_pct: item.international_student_pct || null,
    campus_setting: item.campus_setting || null,
    location_type: item.campus_setting || null,
    website: item.website_url || item.website || null,
    sat_range: item.sat_range || null,
    ielts_min: item.ielts_min || null,
    toefl_min: item.toefl_min || null,
    data_source: 'seeded',
    last_refreshed_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { batchIndex = 0 } = await req.json().catch(() => ({}));
    
    // Process a single batch at a time to avoid timeouts
    const batch = SEED_QUERIES[batchIndex];
    if (!batch) {
      return new Response(JSON.stringify({ 
        message: "All batches complete", 
        totalBatches: SEED_QUERIES.length 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing batch ${batchIndex}: ${batch.label}`);

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a university data research assistant. Return ONLY valid JSON arrays with no explanation text before or after. Each object in the array should have the exact field names requested.",
          },
          { role: "user", content: batch.query },
        ],
        max_tokens: 8000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`Perplexity error for batch ${batchIndex}:`, errorText);
      return new Response(JSON.stringify({ error: `Perplexity API error: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await perplexityResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const universities = extractJSON(content);
    
    console.log(`Parsed ${universities.length} universities from batch ${batchIndex}`);

    if (universities.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No universities parsed from response",
        batchIndex,
        rawContentPreview: content.substring(0, 500),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = universities.map((u: any) => mapToRow(u, batchIndex));

    // Upsert in chunks of 50
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabaseAdmin
        .from("university_database")
        .upsert(chunk, { 
          onConflict: "name,country",
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`Upsert error at chunk ${i}:`, error);
        // Try inserting one by one for this chunk
        for (const row of chunk) {
          const { error: singleError } = await supabaseAdmin
            .from("university_database")
            .upsert(row, { onConflict: "name,country", ignoreDuplicates: false });
          if (!singleError) inserted++;
        }
      } else {
        inserted += chunk.length;
      }
    }

    console.log(`Batch ${batchIndex} complete — ${inserted} universities inserted`);

    return new Response(JSON.stringify({
      message: `Batch ${batchIndex} (${batch.label}) complete`,
      inserted,
      total: universities.length,
      nextBatch: batchIndex + 1 < SEED_QUERIES.length ? batchIndex + 1 : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
