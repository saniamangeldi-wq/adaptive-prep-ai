/**
 * Theme adaptation for question figures.
 *
 * Source SVGs (SAT PDF extraction, AI reconstruction) hardcode a white canvas
 * and near-black ink, which reads as a glaring white slab inside AdaptivePrep's
 * dark surfaces. `themeSvg` strips the baked-in background and rewires ink
 * colours to `currentColor` so the figure inherits the active theme, while
 * leaving genuine data colours (series bars, highlights) untouched.
 */

const NEUTRAL_INK = /^(#0{3,8}|#1{3,6}|#111111|#222222|#333333|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))$/i;
const NEUTRAL_PAPER = /^(#f{3,8}|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;

function isInk(value: string) {
  const v = value.trim();
  if (NEUTRAL_INK.test(v)) return true;
  // #1a1a1a / #222 style very dark greys
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return r < 60 && g < 60 && b < 60;
  }
  return false;
}

function isPaper(value: string) {
  const v = value.trim();
  if (NEUTRAL_PAPER.test(v)) return true;
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return r > 245 && g > 245 && b > 245;
  }
  return false;
}

/** Removes a full-bleed background rect that only exists to paint the canvas. */
function stripBackgroundRect(svg: string): string {
  return svg.replace(/<rect\b[^>]*\/>|<rect\b[^>]*><\/rect>/gi, (tag) => {
    const fill = /fill=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!fill || !isPaper(fill)) return tag;
    const x = Number(/\bx=["']([-\d.]+)["']/i.exec(tag)?.[1] ?? 0);
    const y = Number(/\by=["']([-\d.]+)["']/i.exec(tag)?.[1] ?? 0);
    // Only drop rects anchored at the origin — those are canvases, not data bars.
    return x === 0 && y === 0 ? "" : tag;
  });
}

/** Rewrites neutral ink to `currentColor` in both attributes and inline styles. */
function recolorInk(svg: string): string {
  return svg
    .replace(/(fill|stroke)=["']([^"']+)["']/gi, (full, prop, value) =>
      isInk(value) ? `${prop}="currentColor"` : full
    )
    .replace(/(fill|stroke)\s*:\s*([^;"']+)/gi, (full, prop, value) =>
      isInk(value) ? `${prop}:currentColor` : full
    );
}

export function themeSvg(svg: string): string {
  if (!svg) return "";
  return recolorInk(stripBackgroundRect(svg));
}

export default themeSvg;
