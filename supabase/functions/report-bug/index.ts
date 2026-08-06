import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BugReportPayload {
  question_id: string;
  question_text: string;
  mode: "pregenerated" | "generated";
  model_used: string | null;
  user_selected_answer: string | null;
  correct_answer: string;
  explanation: string | null;
  issue_type: "wrong_answer_key" | "unclear_wording" | "rendering_bug" | "duplicate" | "other";
  free_text: string | null;
  user_tier: "free" | "paid";
  timestamp_iso: string;
  user_agent: string | null;
  session_id: string | null;
}

const LABEL_MAP: Record<string, string> = {
  wrong_answer_key: "bug:answer-key",
  unclear_wording: "bug:wording",
  rendering_bug: "bug:rendering",
  duplicate: "bug:duplicate",
  other: "bug:other",
};

function formatIssueBody(payload: BugReportPayload): string {
  return `
## Question Details
- **Question ID:** ${payload.question_id}
- **Mode:** ${payload.mode}
- **Model Used:** ${payload.model_used ?? "N/A"}
- **Question Text:** ${payload.question_text}

## User Report
- **Issue Type:** ${payload.issue_type}
- **User Selected Answer:** ${payload.user_selected_answer ?? "N/A"}
- **Correct Answer:** ${payload.correct_answer}
- **Explanation:** ${payload.explanation ?? "N/A"}
- **Free Text:** ${payload.free_text ?? "N/A"}

## Context
- **User Tier:** ${payload.user_tier}
- **Timestamp:** ${payload.timestamp_iso}
- **User Agent:** ${payload.user_agent ?? "N/A"}
- **Session ID:** ${payload.session_id ?? "N/A"}
`.trim();
}

async function searchGitHubIssues(questionId: string, issueType: string): Promise<{ number: number } | null> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

  const query = `repo:saniamangeldi-wq/adaptive-prep-ai is:issue "[Bug] ${issueType} — Question ${questionId}"`;
  const response = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (data.items && data.items.length > 0) {
    return { number: data.items[0].number };
  }

  return null;
}

async function createGitHubIssue(title: string, body: string, labels: string[]): Promise<{ number: number }> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

  const response = await fetch("https://api.github.com/repos/saniamangeldi-wq/adaptive-prep-ai/issues", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      labels,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API create issue failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { number: data.number };
}

async function addIssueComment(issueNumber: number, comment: string): Promise<void> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

  const response = await fetch(
    `https://api.github.com/repos/saniamangeldi-wq/adaptive-prep-ai/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: comment }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to add comment to issue #${issueNumber}:`, response.status, errorText);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const payload = await req.json() as BugReportPayload;

    // Validate required fields
    if (!payload.question_id || !payload.question_text || !payload.issue_type) {
      throw new Error("Missing required fields: question_id, question_text, issue_type");
    }

    // Store report in database
    const { data: report, error: reportError } = await supabaseClient
      .from("sat_question_reports")
      .insert({
        question_id: payload.question_id,
        report_reason: payload.issue_type,
        report_details: payload,
        question_snapshot_json: payload,
      })
      .select()
      .single();

    if (reportError) {
      throw new Error(`Database insert failed: ${reportError.message}`);
    }

    // Dedup check: search for existing GitHub issue
    let existingIssue: { number: number } | null = null;
    try {
      existingIssue = await searchGitHubIssues(payload.question_id, payload.issue_type);
    } catch (e) {
      console.error("GitHub dedup search failed:", e);
      // Continue without dedup if GitHub API fails
    }

    if (existingIssue) {
      // Add comment to existing issue
      await addIssueComment(
        existingIssue.number,
        `New report received at ${payload.timestamp_iso} (tier: ${payload.user_tier})`
      );

      return new Response(
        JSON.stringify({
          status: "deduplicated",
          issue_number: existingIssue.number,
          report_id: report.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create new GitHub issue
    const issueTitle = `[Bug] ${payload.issue_type} — Question ${payload.question_id} (${payload.mode})`;
    const issueBody = formatIssueBody(payload);
    const labels = [LABEL_MAP[payload.issue_type] || "bug:other"];

    const newIssue = await createGitHubIssue(issueTitle, issueBody, labels);

    return new Response(
      JSON.stringify({
        status: "created",
        issue_number: newIssue.number,
        report_id: report.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("report-bug error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
