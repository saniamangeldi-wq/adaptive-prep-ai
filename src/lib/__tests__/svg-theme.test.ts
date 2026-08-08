import { describe, it, expect } from "vitest";
import { themeSvg } from "@/lib/svg-theme";
describe("themeSvg", () => {
  it("strips canvas and recolors ink, keeps data colors", () => {
    const s = '<svg viewBox="0 0 640 400"><rect x="0" y="0" width="640" height="400" fill="white" /><g fill="#111"><text x="55" y="25">Title</text></g><rect x="80" y="100" width="30" height="200" fill="#10B981"/><line stroke="black" x1="0" y1="0" x2="1" y2="1"/></svg>';
    const out = themeSvg(s);
    expect(out).not.toContain('fill="white"');
    expect(out).toContain('fill="currentColor"');
    expect(out).toContain('#10B981');
    expect(out).toContain('stroke="currentColor"');
  });
});
