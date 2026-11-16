import { describe, expect, it } from "vitest";
import { countParagraphs, countWords, latinLetterShare, locateQuote, promptOverlap, splitParagraphs } from "@ielts/text.ts";

describe("countWords", () => {
  it("counts plain words", () => {
    expect(countWords("The graph shows three lines.")).toBe(5);
    expect(countWords("   ")).toBe(0);
    expect(countWords("")).toBe(0);
  });
  it("hyphenated compounds, contractions, numbers and slashes are one word each", () => {
    expect(countWords("a well-known, long-term trend")).toBe(4);
    expect(countWords("It's true that people don't agree")).toBe(6);
    expect(countWords("In 1990, 25% of 3.5 million $400")).toBe(7);
    expect(countWords("and/or")).toBe(1);
  });
  it("free-standing symbols do not count; dashes between words split", () => {
    expect(countWords("cars & buses - trains – planes")).toBe(4);
    expect(countWords("cars—especially old ones")).toBe(4);
  });
  it("handles Cyrillic words as words", () => {
    expect(countWords("Это мой ответ")).toBe(3);
  });
});

describe("paragraphs", () => {
  it("uses blank lines when present", () => {
    const s = "First para line one.\nstill first.\n\nSecond para.\n \n\nThird.";
    expect(countParagraphs(s)).toBe(3);
  });
  it("falls back to single line breaks when there are no blank lines", () => {
    expect(countParagraphs("One.\nTwo.\nThree.")).toBe(3);
  });
  it("handles CRLF and ignores empty blocks", () => {
    expect(countParagraphs("One.\r\n\r\nTwo.\r\n\r\n\r\n")).toBe(2);
    expect(countParagraphs("Single paragraph only.")).toBe(1);
  });
  it("returns offsets into the original text", () => {
    const s = "  Alpha beta.\r\n\r\nGamma delta.";
    const ps = splitParagraphs(s);
    expect(ps.map((p) => s.slice(p.start, p.end))).toEqual(["Alpha beta.", "Gamma delta."]);
  });
});

describe("locateQuote", () => {
  const script = "In my opinion,  the “government” should invest\nmore money — in public transport. It's vital.";

  it("finds exact substrings", () => {
    const m = locateQuote(script, "should invest");
    expect(m?.method).toBe("exact");
    expect(script.slice(m!.start, m!.end)).toBe("should invest");
  });

  it("tolerates whitespace, curly/straight quotes and dashes", () => {
    const m = locateQuote(script, 'the "government" should invest more money - in public');
    expect(m).not.toBeNull();
    expect(m!.method).toBe("tolerant");
    expect(script.slice(m!.start, m!.end)).toBe("the “government” should invest\nmore money — in public");
  });

  it("tolerates case and wrapping quotes/punctuation added by the model", () => {
    const m = locateQuote(script, '"it\'s vital"');
    expect(m).not.toBeNull();
    expect(script.slice(m!.start, m!.end)).toBe("It's vital");
  });

  it("returns null for text that is not in the script", () => {
    expect(locateQuote(script, "the government must ban cars")).toBeNull();
    expect(locateQuote(script, "")).toBeNull();
  });

  it("finds a later occurrence with fromIndex", () => {
    const s = "the cat and the cat";
    const first = locateQuote(s, "the cat")!;
    const second = locateQuote(s, "the cat", first.end)!;
    expect([first.start, second.start]).toEqual([0, 12]);
  });
});

describe("promptOverlap", () => {
  const prompt = "It is sometimes argued that children under the age of twelve should not be allowed to own a smartphone.";
  it("detects copied runs of six or more words", () => {
    const o = promptOverlap("It is sometimes argued that children under the age of twelve should not be allowed to own a smartphone. I agree.", prompt);
    expect(o.copiedWords).toBe(19);
    expect(o.longestRun).toBe(19);
  });
  it("ignores short shared phrases", () => {
    const o = promptOverlap("Many people think children should not own phones until they are older.", prompt);
    expect(o.copiedWords).toBe(0);
  });
});

describe("latinLetterShare", () => {
  it("is high for English and low for Cyrillic", () => {
    expect(latinLetterShare("This is English.")).toBe(1);
    expect(latinLetterShare("Это совсем не английский текст")).toBe(0);
  });
});
