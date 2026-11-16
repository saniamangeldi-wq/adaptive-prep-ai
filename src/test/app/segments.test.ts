import { describe, it, expect } from "vitest";
import { locateIssues, splitScript } from "@/lib/ielts/segments";
import type { InlineIssue } from "@ielts/contract.ts";
import { reportTask2 } from "../fixtures/ielts";

const mk = (quote: string, start: number | null, end: number | null): InlineIssue => ({
  quote, start, end, criterion: "grammar", tag: "other", explanation: "e", suggestion: "s",
});
const join = (segs: { text: string }[]) => segs.map((s) => s.text).join("");

describe("splitScript", () => {
  it("returns one plain segment when there are no issues", () => {
    const r = splitScript("Hello world", []);
    expect(r.segments).toEqual([{ text: "Hello world", start: 0, end: 11, issueIndexes: [] }]);
    expect(r.unlocated).toEqual([]);
  });

  it("highlights a located issue and keeps the text intact", () => {
    const s = "I belive it is true.";
    const r = splitScript(s, [mk("belive", 2, 8)]);
    expect(r.segments.map((x) => [x.text, x.issueIndexes])).toEqual([
      ["I ", []],
      ["belive", [0]],
      [" it is true.", []],
    ]);
  });

  it("splits overlaps into a segment that lists both issues", () => {
    const s = "abcdefghij";
    const r = splitScript(s, [mk("cdefg", 2, 7), mk("efghi", 4, 9)]);
    expect(join(r.segments)).toBe(s);
    expect(r.segments.map((x) => [x.text, x.issueIndexes])).toEqual([
      ["ab", []],
      ["cd", [0]],
      ["efg", [0, 1]],
      ["hi", [1]],
      ["j", []],
    ]);
  });

  it("handles nested issues", () => {
    const r = splitScript("abcdefgh", [mk("bcdefg", 1, 7), mk("de", 3, 5)]);
    expect(r.segments.map((x) => x.issueIndexes)).toEqual([[], [0], [0, 1], [0], []]);
  });

  it("clamps an end offset past the script", () => {
    const r = splitScript("abc", [mk("bc", 1, 99)]);
    expect(r.segments.map((x) => [x.text, x.issueIndexes])).toEqual([["a", []], ["bc", [0]]]);
  });

  it("falls back to the quote when offsets point at the wrong text", () => {
    const r = splitScript("one two three", [mk("three", 0, 3)]);
    expect(r.segments.find((x) => x.issueIndexes.length)?.text).toBe("three");
  });

  it("falls back to the quote when offsets are null or out of range", () => {
    const s = "one two three";
    const r = splitScript(s, [mk("two", null, null), mk("three", -5, 4), mk("one", 50, 60)]);
    expect(r.unlocated).toEqual([]);
    expect(r.segments.filter((x) => x.issueIndexes.length).map((x) => x.text)).toEqual(["one", "two", "three"]);
  });

  it("lists issues it cannot place as unlocated", () => {
    const r = splitScript("one two", [mk("missing", null, null), mk("", 5, 5), mk("two", 4, 7)]);
    expect(r.unlocated.map((u) => u.index)).toEqual([0, 1]);
    expect(join(r.segments)).toBe("one two");
  });

  it("never crashes on bad data", () => {
    const bad: unknown[] = [null, undefined, 5, "x", {}, { quote: 5, start: "a", end: {} }, { quote: "a", start: NaN, end: Infinity }, { quote: "a", start: 1.5, end: 2.5 }];
    expect(() => splitScript("a b c", bad)).not.toThrow();
    expect(() => splitScript("", bad)).not.toThrow();
    expect(() => splitScript(undefined as unknown as string, undefined)).not.toThrow();
    expect(splitScript("", []).segments).toEqual([]);
    expect(locateIssues("abc", "nope").located).toEqual([]);
  });

  it("works on the real fixture and joins back to the script", () => {
    const r = splitScript(reportTask2.script, reportTask2.issues);
    expect(join(r.segments)).toBe(reportTask2.script);
    expect(r.unlocated.map((u) => u.index)).toEqual([10]);
    expect(r.segments.some((s) => s.issueIndexes.length > 1)).toBe(true);
  });
});
