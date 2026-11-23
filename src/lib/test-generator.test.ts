import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { calculateScore, estimateSatScore, type Question } from "./test-generator";
import { classifySkill } from "./sat-skills";

const q = (id: string, section: Question["section"], difficulty: Question["difficulty"], text: string): Question => ({
  id, section, difficulty, text, type: "multiple_choice", topic: section, options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
});

describe("classifySkill", () => {
  it("maps standard Reading & Writing stems to SAT domains", () => {
    expect(classifySkill(q("1", "reading_writing", "easy", "Which choice completes the text so that it conforms to the conventions of Standard English?"))).toBe("standard_english");
    expect(classifySkill(q("2", "reading_writing", "easy", "Which choice completes the text with the most logical transition?"))).toBe("expression_ideas");
    expect(classifySkill(q("3", "reading_writing", "easy", "Which choice completes the text with the most logical and precise word or phrase?"))).toBe("craft_structure");
    expect(classifySkill(q("4", "reading_writing", "easy", "Which choice best states the main idea of the text?"))).toBe("information_ideas");
  });
  it("classifies math by keywords and defaults to algebra", () => {
    expect(classifySkill(q("5", "math", "easy", "A circle has radius 4. What is its area?"))).toBe("geometry_trig");
    expect(classifySkill(q("6", "math", "easy", "What percentage of the beads are silver?"))).toBe("data_analysis");
    expect(classifySkill(q("7", "math", "easy", "Which expression is equivalent to 3 x squared plus 2?"))).toBe("advanced_math");
    expect(classifySkill(q("8", "math", "easy", "4 x plus 6 equals 18. What is x?"))).toBe("algebra");
  });
  it("prefers an explicit skill", () => {
    expect(classifySkill({ ...q("9", "math", "easy", "circle radius"), skill: "algebra" })).toBe("algebra");
  });
});

describe("calculateScore", () => {
  it("counts by section and skill and returns one result per question", () => {
    const qs = [q("a", "math", "hard", "circle radius"), q("b", "math", "easy", "4 x plus 6 equals 18")];
    const r = calculateScore(qs, { a: "A", b: "C" });
    expect(r.score).toBe(50);
    expect(r.bySkill).toEqual({ geometry_trig: { correct: 1, total: 1 }, algebra: { correct: 0, total: 1 } });
    expect(r.skillResults).toEqual([
      { skill: "geometry_trig", difficulty: "hard", correct: true },
      { skill: "algebra", difficulty: "easy", correct: false },
    ]);
  });
});

describe("estimateSatScore", () => {
  const section = (s: Question["section"], n: number) => Array.from({ length: n }, (_, i) => q(`${s}${i}`, s, "normal", "x"));
  const all = [...section("reading_writing", 54), ...section("math", 44)];
  const answers = (pct: number) => Object.fromEntries(all.map((x, i) => [x.id, (i % 100) < pct ? "A" : "B"]));

  it("all correct on the harder route is 1600", () => {
    const e = estimateSatScore(all, Object.fromEntries(all.map((x) => [x.id, "A"])), { reading_writing: "harder", math: "harder" });
    expect(e.total).toBe(1600);
    expect(e.high).toBe(1600);
    expect(e.low).toBe(1540);
  });
  it("nothing correct is 400", () => {
    expect(estimateSatScore(all, {}, {}).total).toBe(400);
  });
  it("the easier Module 2 caps a section at 610", () => {
    const e = estimateSatScore(all, Object.fromEntries(all.map((x) => [x.id, "A"])), { reading_writing: "easier", math: "harder" });
    expect(e.readingWriting).toBe(610);
    expect(e.math).toBe(800);
  });
  it("scores land on multiples of 10 inside 200–800", () => {
    const e = estimateSatScore(all, answers(63), { reading_writing: "harder", math: "easier" });
    for (const v of [e.readingWriting, e.math]) {
      expect(v % 10).toBe(0);
      expect(v).toBeGreaterThanOrEqual(200);
      expect(v).toBeLessThanOrEqual(800);
    }
  });
});
