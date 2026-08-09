import { describe, expect, it } from "vitest";
import { parseConcatenatedTable, splitPassages, splitNumberBlob } from "@/lib/rw-structure";
import { resolveQuestionParts } from "@/lib/question-table";
import type { Question } from "@/lib/test-generator";

const q = (text: string): Question => ({
  id: "rw-1", type: "multiple_choice", section: "reading_writing", difficulty: "hard",
  topic: "reading_writing", text, options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
});

describe("concatenated Reading & Writing tables", () => {
  it("recovers the Swahili speakers table", () => {
    const table = parseConcatenatedTable(
      "CountryApproximate number of speakers (in millions)Estimated % of populationDemocratic Republic of the Congo2225Kenya55100Tanzania61100"
    );
    expect(table).not.toBeNull();
    expect(table!.headers).toEqual([
      "Country",
      "Approximate number of speakers (in millions)",
      "Estimated % of population",
    ]);
    expect(table!.rows).toEqual([
      ["Democratic Republic of the Congo", "22", "25"],
      ["Kenya", "55", "100"],
      ["Tanzania", "61", "100"],
    ]);
  });

  it("recovers the juvenile plants table including totals and percents", () => {
    const table = parseConcatenatedTable(
      "SpeciesBare groundPatches of vegetationTotalPercent found in patches of vegetationT. moroderi9132259.1%T. libanitis8312020359.1%H. syriacim9510620152.7%H. squamatum21832153959.6%H. stoechas11122352.2%"
    );
    expect(table).not.toBeNull();
    expect(table!.headers).toHaveLength(5);
    expect(table!.rows[0]).toEqual(["T. moroderi", "9", "13", "22", "59.1%"]);
    expect(table!.rows[1]).toEqual(["T. libanitis", "83", "120", "203", "59.1%"]);
    expect(table!.rows[3]).toEqual(["H. squamatum", "218", "321", "539", "59.6%"]);
  });

  it("recovers the nucleobase concentrations table and keeps 'not detected' cells", () => {
    const table = parseConcatenatedTable(
      "NucleobaseMurchison meteorite sample 1Murchison meteorite sample 2Murchison soil sampleIsoguanine0.50.04not detectedPurine0.20.02not detectedXanthine3931Adenine15140Hypoxanthine2412"
    );
    expect(table).not.toBeNull();
    expect(table!.headers).toEqual([
      "Nucleobase",
      "Murchison meteorite sample 1",
      "Murchison meteorite sample 2",
      "Murchison soil sample",
    ]);
    expect(table!.rows).toHaveLength(5);
    expect(table!.rows[0]).toEqual(["Isoguanine", "0.5", "0.04", "not detected"]);
    expect(table!.rows.every((r) => r.length === 4)).toBe(true);
  });

  it("recovers the ablation rates table with acronym headers", () => {
    const table = parseConcatenatedTable(
      "ElementSPCASTHTCOCCiron20%28%90%98%potassium44%74%97%100%sodium45%75%99%100%"
    );
    expect(table).not.toBeNull();
    expect(table!.headers).toEqual(["Element", "SPC", "AST", "HTC", "OCC"]);
    expect(table!.rows[0]).toEqual(["iron", "20%", "28%", "90%", "98%"]);
    expect(table!.rows[2]).toEqual(["sodium", "45%", "75%", "99%", "100%"]);
  });

  it("keeps the prose and lifts the table out of the question text", () => {
    const parts = resolveQuestionParts(
      q(
        "Swahili Speakers in Three African Countries\n\nCountryApproximate number of speakers (in millions)Estimated % of populationDemocratic Republic of the Congo2225Kenya55100Tanzania61100\n\nSwahili is estimated to be the first language of up to 15 million people worldwide.\n\nWhich choice most effectively uses data from the table to support the underlined claim?"
      )
    );
    expect(parts.table).toBeDefined();
    expect(parts.table!.caption).toBe("Swahili Speakers in Three African Countries");
    expect(parts.text).toContain("Which choice most effectively uses data");
    expect(parts.text).not.toContain("Kenya55100");
  });

  it("leaves a text-only Reading & Writing question untouched", () => {
    const text =
      "The following text is adapted from a novel. Which choice best states the main idea of the text?";
    const parts = resolveQuestionParts(q(text));
    expect(parts.table).toBeUndefined();
    expect(parts.text).toBe(text);
  });

  it("splits digit runs preferring a total column", () => {
    expect(splitNumberBlob("91322", 3)).toEqual(["9", "13", "22"]);
    expect(splitNumberBlob("0.50.04", 2)).toEqual(["0.5", "0.04"]);
  });
});

describe("Text 1 / Text 2 separation", () => {
  it("renders merged passages as separate labeled sections", () => {
    const sections = splitPassages(
      "Text 1 Soy sauce is noted for its umami flavor. Text 2 A 2022 experiment led to a greater understanding. Based on the texts, both authors would most likely agree with which statement?"
    );
    expect(sections.map((s) => s.label)).toEqual(["Text 1", "Text 2", undefined]);
    expect(sections[0].body).toContain("Soy sauce");
    expect(sections[0].body).not.toContain("2022 experiment");
    expect(sections[1].body).toContain("2022 experiment");
    expect(sections[2].body.startsWith("Based on the texts")).toBe(true);
  });

  it("returns a single unlabeled section for ordinary prose", () => {
    const sections = splitPassages("Which choice best states the main idea?");
    expect(sections).toEqual([{ body: "Which choice best states the main idea?" }]);
  });
});
