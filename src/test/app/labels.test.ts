import { describe, it, expect } from "vitest";
import { ERROR_TAGS, VARIANTS_BY_TASK, type ReportFlag } from "@ielts/contract.ts";
import { CONFIDENCE_TEXT, ERROR_TAG_LABELS, FLAG_TEXT, VARIANT_LABELS, criterionLabel, describeTask, errorTagLabel, flagText, formatBand, formatDuration, taskTypeLabel, variantLabel } from "@/lib/ielts/labels";
import { countParagraphs, countWords } from "@/lib/ielts/words";

describe("labels", () => {
  it("has a label for every error tag and variant in the contract", () => {
    for (const tag of ERROR_TAGS) expect(ERROR_TAG_LABELS[tag]).toBeTruthy();
    for (const list of Object.values(VARIANTS_BY_TASK)) for (const v of list) expect(VARIANT_LABELS[v]).toBeTruthy();
  });
  it("has one sentence for every flag", () => {
    const flags: ReportFlag[] = ["under_length", "severely_under_length", "off_topic", "not_english", "copied_from_prompt", "memorised_or_template", "wrong_task_variant", "visual_not_available"];
    for (const f of flags) expect(FLAG_TEXT[f]).toMatch(/\.$/);
    expect(Object.keys(CONFIDENCE_TEXT)).toEqual(["high", "medium", "low"]);
  });
  it("falls back for unknown keys instead of crashing", () => {
    expect(errorTagLabel("brand_new_tag")).toBe("Brand new tag");
    expect(flagText("something_new")).toBe("Something new");
    expect(variantLabel("zzz")).toBe("Zzz");
    expect(taskTypeLabel("task9")).toBe("Task9");
  });
  it("describes tasks", () => {
    expect(describeTask("task2", "opinion")).toBe("Task 2, opinion essay");
    expect(describeTask("task1_academic", "line_graph")).toBe("Academic Task 1, line graph");
    expect(describeTask("task1_general", "letter_formal")).toBe("General Task 1, formal letter");
    expect(describeTask("task2")).toBe("Task 2");
  });
  it("labels the task criterion by task type", () => {
    expect(criterionLabel("task", "task2")).toBe("Task Response");
    expect(criterionLabel("task", "task1_academic")).toBe("Task Achievement");
    expect(criterionLabel("grammar")).toBe("Grammatical Range and Accuracy");
  });
  it("formats bands and durations", () => {
    expect(formatBand(6)).toBe("6.0");
    expect(formatBand(6.5)).toBe("6.5");
    expect(formatBand(null)).toBe("n/a");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(-4)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
  });
});

describe("word counting", () => {
  it("counts words the way the server does", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("Hello, world!")).toBe(2);
    expect(countWords("a well-known long-term plan")).toBe(4);
    expect(countWords("don't stop")).toBe(2);
    expect(countWords("rose 25% in 1990 - & beyond")).toBe(5);
    expect(countWords("cars—especially vans")).toBe(3);
    expect(countWords(undefined as unknown as string)).toBe(0);
  });
  it("counts paragraphs by blank lines or single newlines", () => {
    expect(countParagraphs("")).toBe(0);
    expect(countParagraphs("One.\n\nTwo.\n\nThree.")).toBe(3);
    expect(countParagraphs("One.\nTwo.")).toBe(2);
    expect(countParagraphs("One\nstill one\n\nTwo")).toBe(2);
  });
});
