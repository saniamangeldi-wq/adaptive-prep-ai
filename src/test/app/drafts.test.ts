import { describe, it, expect } from "vitest";
import { chooseDraft, readLocalDraft, writeLocalDraft, clearLocalDraft, readSeenTaskIds, rememberSeenTaskId, type LocalDraft } from "@/lib/ielts/drafts";
import { draftFixture, taskTask2 } from "../fixtures/ielts";

const local = (updatedAt: string, script = "local text"): LocalDraft => ({ task: taskTask2, script, secondsUsed: 10, updatedAt });
const server = (updatedAt: string, script = "server text") => ({ ...draftFixture, script, updatedAt });

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("chooseDraft", () => {
  it("returns null when neither exists", () => {
    expect(chooseDraft(null, null)).toBeNull();
    expect(chooseDraft(undefined, undefined)).toBeNull();
  });
  it("uses the only copy that exists", () => {
    expect(chooseDraft(local("2026-01-01T00:00:00Z"), null)).toMatchObject({ source: "local", serverIsStale: true });
    expect(chooseDraft(null, server("2026-01-01T00:00:00Z"))).toMatchObject({ source: "server", serverIsStale: false });
  });
  it("newer wins", () => {
    expect(chooseDraft(local("2026-01-02T00:00:00Z"), server("2026-01-01T00:00:00Z"))?.script).toBe("local text");
    expect(chooseDraft(local("2026-01-01T00:00:00Z"), server("2026-01-02T00:00:00Z"))?.script).toBe("server text");
  });
  it("prefers the server on a tie", () => {
    expect(chooseDraft(local("2026-01-01T00:00:00Z"), server("2026-01-01T00:00:00Z"))?.source).toBe("server");
  });
  it("copes with bad timestamps and bad records", () => {
    expect(chooseDraft(local("not a date"), server("2026-01-01T00:00:00Z"))?.source).toBe("server");
    expect(chooseDraft(local("2026-01-01T00:00:00Z"), server("nope"))?.source).toBe("local");
    expect(chooseDraft({ ...local("2026-01-01T00:00:00Z"), script: 5 as unknown as string }, null)).toBeNull();
    expect(chooseDraft(local("2026-01-01T00:00:00Z"), { ...draftFixture, task: null as never })?.source).toBe("local");
  });
});

describe("local draft storage", () => {
  it("round-trips and clears", () => {
    const st = memoryStorage();
    expect(writeLocalDraft("s1", local("2026-01-01T00:00:00Z"), st)).toBe(true);
    expect(readLocalDraft("s1", st)?.script).toBe("local text");
    clearLocalDraft("s1", st);
    expect(readLocalDraft("s1", st)).toBeNull();
  });
  it("ignores corrupt data", () => {
    const st = memoryStorage();
    st.setItem("adaptiveprep:ielts-draft:s2", "{not json");
    expect(readLocalDraft("s2", st)).toBeNull();
    st.setItem("adaptiveprep:ielts-draft:s3", JSON.stringify({ script: 1 }));
    expect(readLocalDraft("s3", st)).toBeNull();
  });
  it("does not throw when storage fails", () => {
    const broken = { setItem() { throw new Error("full"); }, getItem() { throw new Error("no"); }, removeItem() { throw new Error("no"); } };
    expect(writeLocalDraft("s", local("2026-01-01T00:00:00Z"), broken)).toBe(false);
    expect(readLocalDraft("s", broken)).toBeNull();
    expect(() => clearLocalDraft("s", broken)).not.toThrow();
  });
});

describe("seen task ids", () => {
  it("remembers, de-duplicates and ignores custom", () => {
    const st = memoryStorage();
    rememberSeenTaskId("a", st);
    rememberSeenTaskId("b", st);
    rememberSeenTaskId("a", st);
    rememberSeenTaskId("custom", st);
    expect(readSeenTaskIds(st)).toEqual(["b", "a"]);
  });
  it("caps the list", () => {
    const st = memoryStorage();
    for (let i = 0; i < 100; i++) rememberSeenTaskId(`t${i}`, st);
    const ids = readSeenTaskIds(st);
    expect(ids.length).toBe(60);
    expect(ids[ids.length - 1]).toBe("t99");
  });
});
