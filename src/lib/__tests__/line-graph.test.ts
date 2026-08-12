import { describe, it, expect } from "vitest";
import { extractLineGraphTable } from "@/lib/sat-content";

const singer = `60,00050,00040,00030,00020,00010,0000Machines sold1903190819131918Singer Sewing Machine Salesin Four Countries, 1903–1918Year New Zealand Australia the Philippines Turkey
The following 4 lines are shown:

New Zealand
Australia
the Philippines
Turkey

The New Zealand line:

Begins at 1903, 4,284
Rises gradually to 1908, 4,918
Rises gradually to 1913, 4,962
Falls gradually to 1918, 4,119

The Australia line:

Begins at 1903, 21,147
Rises gradually to 1908, 24,276
Rises gradually to 1913, 24,495
Falls gradually to 1918, 20,332

The Philippines line:

Begins at 1903, 1,937
Rises gradually to 1908, 2,241
Rises sharply to 1913, 27,266
Rises sharply to 1918, 44,820

The Turkey line:

Begins at 1903, 24,439
Rises sharply to 1908, 33,200
Rises sharply to 1913, 50,794
Falls sharply to 1918, 13,604

By the early 1900s, the Singer Corporation began to see rapidly increasing sales abroad.

Which choice most effectively uses data from the graph to complete the example?`;

describe("line graph recovery", () => {
  it("builds a table", () => {
    const r = extractLineGraphTable(singer);
    expect(r.table?.chart).toBe("line");
    expect(r.table?.headers).toEqual(["Year", "New Zealand", "Australia", "the Philippines", "Turkey"]);
    expect(r.table?.rows.length).toBe(4);
    expect(r.table?.rows[0]).toEqual(["1903", "4,284", "21,147", "1,937", "24,439"]);
    expect(r.text.startsWith("By the early 1900s")).toBe(true);
    expect(r.table?.caption).toContain("Singer");
  });
  it("handles negative x and units", () => {
    const t = `1,5001,0005000Number of beam breaks-410Minutes from treatment females with CNO
The following 1 lines are shown:

females with CNO

The females with CNO line:

Begins at negative 4, 500
Rises sharply to 10, 735

To investigate the influence of certain estrogen-responsive neurons on energy expenditure in mice.`;
    const r = extractLineGraphTable(t);
    expect(r.table?.rows).toEqual([["−4", "500"], ["10", "735"]]);
  });
  it("leaves plain text alone", () => {
    expect(extractLineGraphTable("What is 2 + 2?").table).toBeUndefined();
  });
});
