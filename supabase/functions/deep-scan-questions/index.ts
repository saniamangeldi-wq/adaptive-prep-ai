import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAINTENANCE_TOKEN = Deno.env.get("SAT_MEDIA_MAINTENANCE_TOKEN") ?? "";

/**
 * Deterministic deep scan + repair of the SAT question corpus.
 *
 * Unlike `restructure-sat-media` (AI powered), every repair here is rule based
 * and reversible in intent: it only moves data that already exists in the
 * question text into structured fields, and never rewrites wording.
 *
 * Repairs:
 *  1. flattened_bar_chart  - "For each data category, the following bars are
 *     shown:" blocks become a real `table`, and the glued axis preamble is
 *     dropped from the prompt text.
 *  2. literal_newline      - stored "\\n" escape sequences become real breaks.
 *  3. duplicated_negative  - "-0.9357negative 0.9357" collapses to "-0.9357".
 */

type Table = { headers: string[]; rows: string[][]; caption?: string; chart?: "bar" | "line" };

const CHART_MARKER = /For each data category, the following bars are shown:/i;
const DATA_MARKER = /The data for the \d+ categories are as follows:/i;

/** Recovers a bar-chart block into a table plus the surviving prose. */
export function parseFlattenedBarChart(text: string): { table: Table; text: string } | null {
  if (!CHART_MARKER.test(text) || !DATA_MARKER.test(text)) return null;

  const lines = text.split(/\r?\n/);
  const markerIdx = lines.findIndex((l) => CHART_MARKER.test(l));
  const dataIdx = lines.findIndex((l) => DATA_MARKER.test(l));
  if (markerIdx === -1 || dataIdx === -1 || dataIdx < markerIdx) return null;

  const categories = lines
    .slice(markerIdx + 1, dataIdx)
    .map((l) => l.trim())
    .filter(Boolean);
  if (categories.length < 2) return null;

  const rows: string[][] = [];
  let current: { label: string; values: Record<string, string> } | null = null;
  let i = dataIdx + 1;

  const flush = () => {
    if (!current) return;
    rows.push([current.label, ...categories.map((c) => current!.values[c] ?? "")]);
    current = null;
  };

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const pair = line.match(/^(.+?):\s*(.+)$/);
    if (pair && categories.includes(pair[1].trim())) {
      if (!current) return null;
      current.values[pair[1].trim()] = pair[2].trim();
      continue;
    }
    if (/^.{1,60}:$/.test(line)) {
      flush();
      current = { label: line.replace(/:$/, "").trim(), values: {} };
      continue;
    }
    break; // first line that is neither a group label nor a data pair = prose
  }
  flush();
  if (rows.length === 0) return null;
  if (!rows.every((r) => r.slice(1).some(Boolean))) return null;

  const prose = lines.slice(i).join("\n").trim();
  if (prose.length < 40) return null;

  // The pre-marker preamble is the glued axis/legend jumble; the trailing part
  // of its first line usually still holds a readable chart title.
  const preamble = lines.slice(0, markerIdx).join(" ");
  const caption = extractCaption(preamble, categories);

  return {
    table: { headers: ["", ...categories], rows, chart: "bar", ...(caption ? { caption } : {}) },
    text: prose,
  };
}

/** Best-effort chart title out of the glued axis preamble. */
function stripLegend(preamble: string, series: string[]): string {
  let head = preamble.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const name of series) {
      if (head.toLowerCase().endsWith(name.toLowerCase())) {
        head = head.slice(0, head.length - name.length).trim();
        changed = true;
      }
    }
  }
  return head;
}

function extractCaption(preamble: string, series: string[] = []): string | undefined {
  let head = stripLegend(preamble, series);
  const axis = head.match(/([A-Z][a-z]+(?: [a-z]+){0,3})$/)?.[1]?.trim();
  if (axis && axis.length <= 40 && head.endsWith(axis)) head = head.slice(0, head.length - axis.length);
  const candidate = head
    .split(/[\d,.]{2,}/)
    .map((part) => part.trim().replace(/^[^A-Za-z]+/, ""))
    .filter((part) => part.split(/\s+/).length >= 3)
    .sort((a, b) => b.length - a.length)[0];
  if (!candidate || candidate.length < 20 || candidate.length > 180) return undefined;
  const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
  return candidate
    .replace(new RegExp(`^.*(?:${MONTHS})(?=[A-Z])`), "")
    .replace(/([a-z]{3,})(in|from|of|and|for|by|with)(?=[A-Z ]|$)/g, "$1 $2")
    .replace(/\b(in|from|of|and|for|by|to|with)(?=[A-Z])/g, "$1 ")
    .replace(/[,\s]+$/, "")
    .replace(/\s+(in|from|of|and|for|by|to|with)$/, "")
    .trim();
}


/* ------------------------- line graph recovery ------------------------- */

const LINE_HEADER_RE = /^The following (\d+) lines are shown:\s*$/i;
const SERIES_HEADER_RE = /^The (.+?) line:\s*$/i;
const POINT_RE =
  /^(?:Begins at|(?:Rises|Falls)(?: sharply| gradually)? to|Remains level to|Ends at)\s+(.+?),\s*((?:negative\s+)?[−–-]?[\d,]+(?:\.\d+)?(?:\s*[A-Za-z%][A-Za-z%\s.]*)?)$/i;

const cleanNumberWord = (v: string) => v.trim().replace(/^negative\s+/i, "−");

/**
 * Recovers a multi-series dataset from a flattened screen-reader line-graph
 * narration. Deterministic: only moves data that already exists in the stem.
 */
export function parseLineGraph(rawText: string): { table: Table; text: string } | null {
  if (!rawText || !/The following \d+ lines are shown:/i.test(rawText)) return null;
  const lines = rawText.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => LINE_HEADER_RE.test(l.trim()));
  if (headerIdx === -1) return null;

  const series: string[] = [];
  const points = new Map<string, Map<string, string>>();
  const xOrder: string[] = [];
  let current: string | null = null;
  let lastDataIdx = headerIdx;
  let i = headerIdx + 1;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const seriesHeader = line.match(SERIES_HEADER_RE);
    if (seriesHeader) {
      const name = seriesHeader[1].trim();
      current =
        series.find((s) => s.toLowerCase() === name.toLowerCase() || s.toLowerCase().endsWith(` ${name.toLowerCase()}`)) ??
        name;
      if (!points.has(current)) points.set(current, new Map());
      lastDataIdx = i;
      continue;
    }

    const point = line.match(POINT_RE);
    if (point && current) {
      const x = cleanNumberWord(point[1]);
      const y = cleanNumberWord(point[2]);
      if (!xOrder.includes(x)) xOrder.push(x);
      points.get(current)!.set(x, y);
      lastDataIdx = i;
      continue;
    }

    if (!current && line.length <= 60 && !/[.?!]$/.test(line)) {
      series.push(line);
      lastDataIdx = i;
      continue;
    }
    break;
  }

  const names = [...points.keys()];
  if (names.length < 1 || xOrder.length < 2) return null;

  const prose = lines.slice(lastDataIdx + 1).join("\n").trim();
  if (prose.length < 40) return null;

  const ordered = series.filter((s) => points.has(s)).concat(names.filter((n) => !series.includes(n)));
  const rows = xOrder.map((x) => [x, ...ordered.map((s) => points.get(s)!.get(x) ?? "")]);

  const preamble = lines.slice(0, headerIdx).join(" ");
  const caption = extractCaption(preamble, ordered);
  const xLabel = extractAxisLabel(preamble, ordered) ?? "";

  return {
    table: { headers: [xLabel, ...ordered], rows, chart: "line", ...(caption ? { caption } : {}) },
    text: prose,
  };
}

function extractAxisLabel(preamble: string, series: string[]): string | undefined {
  let head = preamble;
  for (const name of series) {
    const idx = head.indexOf(name);
    if (idx > 0) head = head.slice(0, idx);
  }
  const match = head.trim().match(/([A-Z][a-z]+(?: [a-z]+){0,3})$/);
  const label = match?.[1]?.trim();
  return label && label.length <= 40 ? label : undefined;
}

/** "-0.9357negative 0.9357" -> "-0.9357" (duplicated speech serialization). */
export function collapseDuplicatedNegatives(text: string): string {
  return text
    .replace(/([−–-])(\d+(?:\.\d+)?)negative\s+\2\b/g, "−$2")
    .replace(/(\d+(?:\.\d+)?)negative\s+\1\b/g, "−$1");
}

export function unescapeNewlines(text: string): string {
  return text.includes("\\n") ? text.replace(/\\r/g, "").replace(/\\n/g, "\n") : text;
}

function repairText(text: string): string {
  return collapseDuplicatedNegatives(unescapeNewlines(text));
}

const FLAGS = {
  flattened_bar_chart: (q: any) => CHART_MARKER.test(q.text ?? "") && DATA_MARKER.test(q.text ?? ""),
  flattened_line_graph: (q: any) => /The following \d+ lines are shown:/i.test(q.text ?? ""),
  literal_newline: (q: any) => (q.text ?? "").includes("\\n") || (q.stimulus ?? "").includes("\\n"),
  duplicated_negative: (q: any) => /(\d)negative\s+\d/.test(q.text ?? ""),
  speech_math: (q: any) =>
    /\b(Superscript|Subscript|Baseline|StartFraction|EndFraction|StartRoot|EndRoot)\b/.test(
      `${q.text ?? ""} ${q.stimulus ?? ""}`
    ),
  glued_table_in_text: (q: any) =>
    !q.table && !q.figure && /[a-z)”"][A-Z][a-z]+\d|\d[A-Z][a-z]{2,}/.test(q.text ?? ""),
  visual_referenced_no_visual: (q: any) =>
    !q.table &&
    !q.figure &&
    !q.image_url &&
    /\b(?:the|following|given) (?:table|graph|chart|figure|diagram)\b|\bshown above\b/i.test(q.text ?? ""),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let authorized = token === SERVICE_ROLE || (!!MAINTENANCE_TOKEN && token === MAINTENANCE_TOKEN);
    if (!authorized) {
      const { data: userRes } = await admin.auth.getUser(token);
      const uid = userRes?.user?.id;
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const { data: profile } = await admin.from("profiles").select("role").eq("user_id", uid).maybeSingle();
      authorized = profile?.role === "school_admin";
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = Boolean(body?.dry_run);

    const { data: tests, error } = await admin.from("sat_tests").select("id, questions");
    if (error) throw error;

    const counts: Record<string, number> = {};
    const repaired = { bar_chart_tables: 0, line_chart_tables: 0, literal_newline: 0, duplicated_negative: 0 };
    const examples: Record<string, string[]> = {};
    let total = 0;

    for (const test of tests ?? []) {
      const questions = Array.isArray(test.questions) ? [...(test.questions as any[])] : [];
      let dirty = false;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q || typeof q !== "object") continue;
        total++;

        for (const [flag, fn] of Object.entries(FLAGS)) {
          if (fn(q)) {
            counts[flag] = (counts[flag] ?? 0) + 1;
            (examples[flag] ??= []).length < 5 && examples[flag].push(String(q.id));
          }
        }

        let next = { ...q };
        let changed = false;

        if (!next.table) {
          const graph = parseLineGraph(next.text ?? "");
          if (graph) {
            next.table = graph.table;
            next.text = graph.text;
            next.visual_unavailable = false;
            repaired.line_chart_tables++;
            changed = true;
          }
        }

        if (!next.table) {
          const parsed = parseFlattenedBarChart(next.text ?? "");
          if (parsed) {
            next.table = parsed.table;
            next.text = parsed.text;
            next.visual_unavailable = false;
            repaired.bar_chart_tables++;
            changed = true;
          }
        }

        for (const field of ["text", "stimulus"] as const) {
          if (typeof next[field] === "string") {
            const fixed = repairText(next[field]);
            if (fixed !== next[field]) {
              if (next[field].includes("\\n")) repaired.literal_newline++;
              if (/(\d)negative\s+\d/.test(next[field])) repaired.duplicated_negative++;
              next[field] = fixed;
              changed = true;
            }
          }
        }

        if (changed) {
          questions[i] = next;
          dirty = true;
        }
      }

      if (dirty && !dryRun) {
        const { error: upErr } = await admin.from("sat_tests").update({ questions }).eq("id", test.id);
        if (upErr) throw upErr;
      }
    }

    return json({ ok: true, dry_run: dryRun, total, counts, examples, repaired });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
