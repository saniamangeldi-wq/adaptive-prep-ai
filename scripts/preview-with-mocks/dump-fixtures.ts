/**
 * Writes the browser-check fixtures as JSON for mock_server.py.
 * Run through vite-node so the @ / @ielts aliases resolve:
 *   npx vite-node scripts/preview-with-mocks/dump-fixtures.ts > /tmp/ielts-fixtures.json
 * Test-only: nothing in src/ imports this file.
 */
import {
  allTaskFixtures,
  draftFixture,
  legacyRow,
  malformedRows,
  reportTask1Low,
  reportTask2,
  rowFromReport,
  taskBar,
  taskCycle,
  taskLetter,
  taskLine,
  taskMap,
  taskMixed,
  taskPie,
  taskProcess,
  taskProcessBranching,
  taskTable,
  taskTask2,
} from "../../src/test/fixtures/ielts";
import { goodOpinionOutput, OPINION_SCRIPT, OPINION_TASK } from "../../src/test/ielts/fixtures";
import { validateGraderOutput, type GraderOutput } from "../../supabase/functions/_shared/ielts/schema";
import { buildReport, reportRow } from "../../supabase/functions/_shared/ielts/postprocess";
import { TASK_BANK } from "../../supabase/functions/_shared/ielts/taskBank";

// A report built by the real server pipeline with a ceiling applied (adjustments line).
const raw = goodOpinionOutput();
(raw.criteria as Record<string, { band: number }>).task.band = 8;
(raw.checklist as Array<{ met: string }>)[2].met = "partly";
const checked = validateGraderOutput(raw, { taskType: "task2", variant: "opinion", includeModelAnswer: false });
if (!checked.ok) throw new Error("fixture output invalid");
const adjusted = buildReport({
  output: (checked as { value: GraderOutput }).value,
  task: OPINION_TASK,
  script: OPINION_SCRIPT,
  feedbackLang: "en",
  model: "fixture",
  includeModelAnswer: false,
  id: "44444444-4444-4444-8444-444444444444",
  now: "2026-11-14T08:00:00.000Z",
});
const adjustedRow = { ...reportRow(adjusted), user_id: "u", session_id: null, created_at: adjusted.createdAt, updated_at: adjusted.createdAt };

const out = {
  tasks: {
    line: taskLine,
    bar: taskBar,
    pie: taskPie,
    table: taskTable,
    mixed: taskMixed,
    process: taskProcess,
    cycle: taskCycle,
    branching: taskProcessBranching,
    map: taskMap,
    letter: taskLetter,
    task2: taskTask2,
  },
  allTasks: allTaskFixtures,
  bankMaps: TASK_BANK.filter((t) => t.variant === "map"),
  bank: TASK_BANK,
  reports: { task2: reportTask2, task1Low: reportTask1Low, adjusted },
  rows: {
    task2: rowFromReport(reportTask2),
    task1Low: rowFromReport(reportTask1Low),
    adjusted: JSON.parse(JSON.stringify(adjustedRow)),
    legacy: legacyRow,
    malformed: malformedRows,
  },
  draft: draftFixture,
};
process.stdout.write(JSON.stringify(out));
