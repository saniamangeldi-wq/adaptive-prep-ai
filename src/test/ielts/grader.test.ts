import { describe, expect, it } from "vitest";
import { gradeWithModel, type GradeModelInput } from "@ielts/grader.ts";
import { extractStructured, parseJsonLoose } from "@ielts/gateway.ts";
import { GRADER_TOOL_NAME } from "@ielts/schema.ts";
import type { GatewayCallResult } from "@ielts/gateway.ts";
import { goodOpinionOutput, OPINION_SCRIPT, OPINION_TASK } from "./fixtures";

const input: GradeModelInput = {
  task: OPINION_TASK,
  variant: "opinion",
  script: OPINION_SCRIPT,
  feedbackLang: "en",
  includeModelAnswer: false,
  stats: { wordCount: 260, paragraphCount: 5, copiedWords: 0 },
};

const toolResponse = (args: unknown): GatewayCallResult => ({
  ok: true,
  json: { choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{ function: { name: GRADER_TOOL_NAME, arguments: JSON.stringify(args) } }] } }] },
});

function fakeCalls(responses: GatewayCallResult[]) {
  const bodies: Array<Record<string, unknown>> = [];
  return {
    bodies,
    deps: {
      call: async (b: Record<string, unknown>) => {
        bodies.push(b);
        const r = responses.shift();
        if (!r) throw new Error("unexpected extra call");
        return r;
      },
      now: () => 0,
    },
  };
}

describe("gradeWithModel", () => {
  it("one tool call at temperature 0 when the output is valid", async () => {
    const { deps, bodies } = fakeCalls([toolResponse(goodOpinionOutput())]);
    const r = await gradeWithModel(input, deps);
    expect(r.ok).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].temperature).toBe(0);
    expect((bodies[0].tool_choice as any).function.name).toBe(GRADER_TOOL_NAME);
  });

  it("retries once with the validator errors, then succeeds", async () => {
    const bad = goodOpinionOutput();
    (bad.criteria as any).task.band = 6.3;
    const { deps, bodies } = fakeCalls([toolResponse(bad), toolResponse(goodOpinionOutput())]);
    const r = await gradeWithModel(input, deps);
    expect(r.ok && r.attempts).toBe(2);
    const msgs = bodies[1].messages as Array<{ content: string }>;
    expect(msgs[msgs.length - 1].content).toContain("criteria.task.band");
  });

  it("fails with kind 'invalid' after two bad outputs — never a default band", async () => {
    const bad = goodOpinionOutput();
    delete (bad.criteria as any).grammar;
    const { deps } = fakeCalls([toolResponse(bad), { ok: true, json: { choices: [{ message: { content: "Band 9, well done!" } }] } }]);
    const r = await gradeWithModel(input, deps);
    expect(r.ok).toBe(false);
    expect((r as Extract<typeof r, { kind: "invalid" }>).kind).toBe("invalid");
  });

  it("switches to json_object mode when the gateway rejects tools", async () => {
    const { deps, bodies } = fakeCalls([
      { ok: false, status: 400, detail: "tools are not supported for this model" },
      { ok: true, json: { choices: [{ message: { content: "```json\n" + JSON.stringify(goodOpinionOutput()) + "\n```" } }] } },
    ]);
    const r = await gradeWithModel(input, deps);
    expect(r.ok && r.mode).toBe("json");
    expect(bodies[1].response_format).toEqual({ type: "json_object" });
    expect(bodies[1].tools).toBeUndefined();
  });

  it("reports upstream errors without retrying", async () => {
    const { deps, bodies } = fakeCalls([{ ok: false, status: 429, detail: "slow down" }]);
    const r = await gradeWithModel(input, deps);
    expect(r.ok === false && r.kind).toBe("upstream");
    expect(bodies).toHaveLength(1);
  });
});

describe("gateway extraction", () => {
  it("reads tool call arguments", () => {
    const r = extractStructured({ choices: [{ message: { tool_calls: [{ function: { name: "x", arguments: '{"a":1}' } }] } }] }, "x");
    expect(r).toEqual({ ok: true, value: { a: 1 }, via: "tool" });
  });
  it("reports truncation", () => {
    const r = extractStructured({ choices: [{ finish_reason: "length", message: { tool_calls: [{ function: { name: "x", arguments: '{"a":' } }] } }] }, "x");
    expect(r.ok).toBe(false);
    expect((r as Extract<typeof r, { ok: false }>).error).toContain("truncated");
  });
  it("parses fenced or prose-wrapped JSON", () => {
    expect(parseJsonLoose('Here:\n```json\n{"b":2}\n```')).toEqual({ b: 2 });
    expect(parseJsonLoose('result {"c":3} done')).toEqual({ c: 3 });
    expect(parseJsonLoose("no json here")).toBeUndefined();
  });
});
