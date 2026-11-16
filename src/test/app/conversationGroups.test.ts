import { describe, expect, it } from "vitest";
import { firstName, greetingFor, groupByRecency, recencyGroup } from "@/components/dashboard/conversationGroups";

const now = new Date(2026, 10, 16, 21, 30); // 16 Nov 2026, 21:30 local

function at(y: number, m: number, d: number, h = 12) {
  return new Date(y, m, d, h).toISOString();
}

describe("recencyGroup", () => {
  it("uses calendar days, not 24-hour windows", () => {
    expect(recencyGroup(at(2026, 10, 16, 0), now)).toBe("Today");
    expect(recencyGroup(at(2026, 10, 15, 23), now)).toBe("Yesterday");
    expect(recencyGroup(at(2026, 10, 14), now)).toBe("Previous 7 days");
    expect(recencyGroup(at(2026, 10, 10), now)).toBe("Previous 7 days");
    expect(recencyGroup(at(2026, 10, 9), now)).toBe("Previous 30 days");
    expect(recencyGroup(at(2026, 9, 18), now)).toBe("Previous 30 days");
    expect(recencyGroup(at(2026, 9, 17), now)).toBe("Older");
  });

  it("puts a clock-skewed future time in Today and a bad date in Older", () => {
    expect(recencyGroup(at(2026, 10, 17, 1), now)).toBe("Today");
    expect(recencyGroup("not a date", now)).toBe("Older");
  });
});

describe("groupByRecency", () => {
  it("keeps the input order inside each group and drops empty groups", () => {
    const items = [
      { id: "a", updated_at: at(2026, 10, 16, 20) },
      { id: "b", updated_at: at(2026, 10, 16, 9) },
      { id: "c", updated_at: at(2026, 10, 12) },
      { id: "d", updated_at: at(2025, 0, 1) },
    ];
    const groups = groupByRecency(items, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Previous 7 days", "Older"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns nothing for no items", () => {
    expect(groupByRecency([], now)).toEqual([]);
  });
});

describe("greeting helpers", () => {
  it("takes the first word of the name", () => {
    expect(firstName("Aigerim Bekova")).toBe("Aigerim");
    expect(firstName("  ")).toBeNull();
    expect(firstName(null)).toBeNull();
  });

  it("greets by the local hour", () => {
    expect(greetingFor(new Date(2026, 0, 1, 6))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 0, 1, 13))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 0, 1, 23))).toBe("Good evening");
    expect(greetingFor(new Date(2026, 0, 1, 2))).toBe("Good evening");
  });
});
