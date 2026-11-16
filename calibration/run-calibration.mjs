#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// CANNOT BE RUN IN A SANDBOX WITHOUT NETWORK ACCESS OR KEYS. It calls the
// DEPLOYED ielts-grade-writing edge function, which spends real credits and
// real model tokens. Run it on your own machine (Node 18+, no dependencies).
// See calibration/README.md for the gate, the file format and the exit codes.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… CALIBRATION_USER_TOKEN=… \
//     node calibration/run-calibration.mjs [--dir <folder>] [--out results.json]
//       [--limit N] [--include-fictional] [--allow-few] [--lang en]
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GATE_MAX_OVERALL_MAE = 0.5;
const GATE_MIN_SCRIPTS = 30;
const CRITERIA = ["task", "coherence", "lexical", "grammar"];

function parseArgs(argv) {
  const args = { dir: join(dirname(fileURLToPath(import.meta.url)), "scripts"), out: null, limit: Infinity, includeFictional: false, allowFew: false, lang: "en" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") args.dir = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--lang") args.lang = argv[++i];
    else if (a === "--include-fictional") args.includeFictional = true;
    else if (a === "--allow-few") args.allowFew = true;
    else if (a === "--help" || a === "-h") {
      console.log("See calibration/README.md");
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

const isBand = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 9 && Number.isInteger(x * 2);

function checkEntry(e, file) {
  const errs = [];
  if (!e || typeof e !== "object") return [`${file}: entry is not an object`];
  if (typeof e.id !== "string" || !e.id) errs.push("id missing");
  if (!e.task || typeof e.task !== "object" || typeof e.task.prompt !== "string") errs.push("task missing or has no prompt");
  if (typeof e.script !== "string" || e.script.trim().length < 40) errs.push("script missing or too short");
  if (!e.examiner || !isBand(e.examiner.overall)) errs.push("examiner.overall must be a band (0–9, half steps)");
  for (const k of CRITERIA) if (e.examiner && e.examiner[k] !== undefined && !isBand(e.examiner[k])) errs.push(`examiner.${k} is not a band`);
  return errs.map((m) => `${file} [${e?.id ?? "?"}]: ${m}`);
}

async function loadEntries(dir) {
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch (e) {
    console.error(`Cannot read ${dir}: ${e.message}`);
    process.exit(2);
  }
  const entries = [];
  const problems = [];
  const ids = new Set();
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(await readFile(join(dir, f), "utf8"));
    } catch (e) {
      problems.push(`${f}: invalid JSON (${e.message})`);
      continue;
    }
    for (const e of Array.isArray(data) ? data : [data]) {
      const errs = checkEntry(e, f);
      if (errs.length) problems.push(...errs);
      else if (ids.has(e.id)) problems.push(`${f}: duplicate id ${e.id}`);
      else {
        ids.add(e.id);
        entries.push({ ...e, file: f });
      }
    }
  }
  return { entries, problems };
}

async function grade(entry, env, lang) {
  const res = await fetch(`${env.url}/functions/v1/ielts-grade-writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.token}`, apikey: env.anon },
    body: JSON.stringify({ task: entry.task, script: entry.script, feedbackLang: lang, ...(entry.customVisual ? { customVisual: entry.customVisual } : {}) }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

function stats(pairs) {
  // pairs: [{ predicted, actual }]
  if (!pairs.length) return null;
  const errs = pairs.map((p) => p.predicted - p.actual);
  const mae = errs.reduce((a, e) => a + Math.abs(e), 0) / errs.length;
  const bias = errs.reduce((a, e) => a + e, 0) / errs.length;
  const within = errs.filter((e) => Math.abs(e) <= 0.5).length / errs.length;
  return { n: pairs.length, mae, bias, within };
}

const fmt = (s) => (s ? `n=${String(s.n).padStart(3)}  MAE ${s.mae.toFixed(2)}  bias ${s.bias >= 0 ? "+" : ""}${s.bias.toFixed(2)}  within ±0.5: ${(s.within * 100).toFixed(0)}%` : "no data");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = { url: process.env.SUPABASE_URL?.replace(/\/$/, ""), anon: process.env.SUPABASE_ANON_KEY, token: process.env.CALIBRATION_USER_TOKEN };
  if (!env.url || !env.anon || !env.token) {
    console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY and CALIBRATION_USER_TOKEN (see calibration/README.md).");
    process.exit(2);
  }

  const { entries, problems } = await loadEntries(args.dir);
  for (const p of problems) console.warn(`skip: ${p}`);
  const selected = entries.filter((e) => args.includeFictional || !e.fictional).slice(0, args.limit);
  if (!selected.length) {
    console.error(`No usable scripts in ${args.dir}${args.includeFictional ? "" : " (fictional examples are skipped; use --include-fictional for a smoke test)"}.`);
    process.exit(2);
  }

  console.log(`Grading ${selected.length} script(s) from ${args.dir} …\n`);
  const results = [];
  let graderVersion = null;
  for (const e of selected) {
    const { status, body } = await grade(e, env, args.lang);
    if (status === 402) {
      console.error(`Out of credits after ${results.length} script(s); stopping. Re-run tomorrow or use a higher-tier test user.`);
      break;
    }
    if (status !== 200 || !body?.report) {
      console.warn(`${e.id}: HTTP ${status} ${body?.code ?? ""} ${body?.error ?? ""}`);
      results.push({ id: e.id, error: `${status} ${body?.code ?? ""}` });
      continue;
    }
    const r = body.report;
    graderVersion = r.graderVersion;
    const row = { id: e.id, expected: e.examiner, predicted: { overall: r.overall, ...Object.fromEntries(CRITERIA.map((k) => [k, r.criteria[k].band])) }, confidence: r.confidence, flags: r.flags };
    results.push(row);
    const d = r.overall - e.examiner.overall;
    console.log(`${e.id.padEnd(32)} examiner ${e.examiner.overall.toFixed(1)}  grader ${r.overall.toFixed(1)}  (${d >= 0 ? "+" : ""}${d.toFixed(1)})  ${r.confidence}${r.flags.length ? `  [${r.flags.join(", ")}]` : ""}`);
  }

  const ok = results.filter((r) => !r.error);
  console.log(`\nGrader version: ${graderVersion ?? "unknown"}   scored: ${ok.length}   failed: ${results.length - ok.length}\n`);
  const summary = {};
  for (const k of [...CRITERIA, "overall"]) {
    const pairs = ok.filter((r) => typeof r.expected[k] === "number").map((r) => ({ predicted: r.predicted[k], actual: r.expected[k] }));
    summary[k] = stats(pairs);
    console.log(`${k.padEnd(10)} ${fmt(summary[k])}`);
  }

  if (args.out) {
    await writeFile(args.out, JSON.stringify({ graderVersion, ranAt: new Date().toISOString(), summary, results }, null, 2));
    console.log(`\nWrote ${args.out}`);
  }

  const overall = summary.overall;
  if (!overall) process.exit(2);
  if (overall.mae > GATE_MAX_OVERALL_MAE) {
    console.error(`\nFAIL: overall average error ${overall.mae.toFixed(2)} is above ${GATE_MAX_OVERALL_MAE}.`);
    process.exit(1);
  }
  if (overall.n < GATE_MIN_SCRIPTS && !args.allowFew) {
    console.error(`\nNOT ENOUGH DATA: ${overall.n} scored script(s); the gate needs at least ${GATE_MIN_SCRIPTS}.`);
    process.exit(3);
  }
  console.log(`\nPASS: overall average error ${overall.mae.toFixed(2)} ≤ ${GATE_MAX_OVERALL_MAE}${overall.n < GATE_MIN_SCRIPTS ? ` (only ${overall.n} scripts; gate not established)` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
