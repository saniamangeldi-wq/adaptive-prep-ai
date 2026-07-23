import type { VAKStyle } from "./vak-questions";
import {
  SPATIAL_VISUAL_QS,
  EXPRESSIVE_AUDITORY_QS,
  PHYSICAL_KINESTHETIC_QS,
} from "./vak-questions";

export interface VAKScores {
  visual: number;
  auditory: number;
  kinesthetic: number;
}

export interface VAKResult {
  scores: VAKScores; // percentages
  primaryStyle: VAKStyle;
  secondaryStyle: VAKStyle;
  label: string;
  subType: string | null;
  description: string;
  adaptations: string[];
}

const STYLE_ICONS: Record<VAKStyle, string> = {
  visual: "👁️",
  auditory: "👂",
  kinesthetic: "✋",
};

const STYLE_NAMES: Record<VAKStyle, string> = {
  visual: "Visual",
  auditory: "Auditory",
  kinesthetic: "Kinesthetic",
};

function countStyles(answers: Record<number, VAKStyle>): VAKScores {
  const counts = { visual: 0, auditory: 0, kinesthetic: 0 };
  const values = Object.values(answers);
  values.forEach((s) => counts[s]++);
  const total = values.length || 1;
  return {
    visual: Math.round((counts.visual / total) * 100),
    auditory: Math.round((counts.auditory / total) * 100),
    kinesthetic: Math.round((counts.kinesthetic / total) * 100),
  };
}

function getRankedStyles(scores: VAKScores): VAKStyle[] {
  return (Object.entries(scores) as [VAKStyle, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([style]) => style);
}

// ─── FREE tier label ───────────────────────────────────────
function freeLabel(scores: VAKScores, primary: VAKStyle): string {
  if (scores[primary] < 40) return "Multimodal Learner";
  return `${STYLE_NAMES[primary]} Learner`;
}

// ─── PRO tier label (sub-category) ─────────────────────────
function proLabel(scores: VAKScores, primary: VAKStyle): string {
  if (scores[primary] < 40) return "Multimodal Learner";
  const strength = scores[primary] > 60 ? "Strong" : "Moderate";
  return `${strength} ${STYLE_NAMES[primary]} Learner`;
}

// ─── ELITE tier sub-type ───────────────────────────────────
// `answers` is keyed by question id (1-based) — same keys used by
// VAKAssessment when recording each answer.
function eliteSubType(
  answers: Record<number, VAKStyle>,
  scores: VAKScores,
  primary: VAKStyle,
  secondary: VAKStyle
): { label: string; subType: string } {
  // Multimodal check: top 2 within 10%
  if (Math.abs(scores[primary] - scores[secondary]) <= 10 && scores[primary] >= 30) {
    return {
      label: `${STYLE_NAMES[primary]}-${STYLE_NAMES[secondary]} Multimodal Learner`,
      subType: `${primary}-${secondary}_multimodal`,
    };
  }

  if (scores[primary] < 40) {
    return { label: "Multimodal Learner", subType: "multimodal" };
  }

  const ratioMatches = (indicatorIds: number[], style: VAKStyle): boolean => {
    const answered = indicatorIds.filter((qId) => answers[qId] !== undefined);
    if (answered.length === 0) return false;
    const hits = answered.filter((qId) => answers[qId] === style).length;
    return hits / answered.length > 0.5;
  };

  if (primary === "visual") {
    return ratioMatches(SPATIAL_VISUAL_QS, "visual")
      ? { label: "Spatial Visual Learner", subType: "spatial_visual" }
      : { label: "Verbal Visual Learner", subType: "verbal_visual" };
  }

  if (primary === "auditory") {
    return ratioMatches(EXPRESSIVE_AUDITORY_QS, "auditory")
      ? { label: "Expressive Auditory Learner", subType: "expressive_auditory" }
      : { label: "Receptive Auditory Learner", subType: "receptive_auditory" };
  }

  if (primary === "kinesthetic") {
    return ratioMatches(PHYSICAL_KINESTHETIC_QS, "kinesthetic")
      ? { label: "Physical Kinesthetic Learner", subType: "physical_kinesthetic" }
      : { label: "Tactile Kinesthetic Learner", subType: "tactile_kinesthetic" };
  }

  return { label: `${STYLE_NAMES[primary]} Learner`, subType: primary };
}

// ─── Descriptions ──────────────────────────────────────────
// Framed as PREFERENCES (formats you tend to engage with most), not as
// claims about faster/better learning. Research shows everyone benefits
// from multiple formats — we use this to personalize defaults only.
const DESCRIPTIONS: Record<VAKStyle, string> = {
  visual:
    "You tend to reach for images, diagrams, and visual layouts first. We'll lead with those formats — but audio and interactive versions stay one tap away.",
  auditory:
    "You tend to engage most with spoken explanations and discussion. We'll surface read-aloud and verbal walkthroughs by default — visuals and hands-on activities are always available too.",
  kinesthetic:
    "You tend to prefer trying things out and learning by doing. We'll lead with interactive practice — you can still switch to diagrams or audio anytime.",
};

const MULTIMODAL_DESC =
  "You engage comfortably across multiple formats. We'll mix visuals, audio, and interactive content by default — and you can adjust any time.";

// ─── Adaptations ───────────────────────────────────────────
// Framed as defaults ("we'll emphasize"), not exclusions. Every format
// remains accessible from the content controls regardless of result.
const ADAPTATIONS: Record<VAKStyle, string[]> = {
  visual: [
    "We'll emphasize diagrams and charts in AI explanations — audio and interactive versions stay available",
    "Flashcards default to image + word with color coding — you can switch to audio flip anytime",
    "Visual progress bars and mind maps are enabled by default",
  ],
  auditory: [
    "Text-to-speech is on by default — you can mute it or switch to visual layouts anytime",
    "Read-aloud buttons appear prominently on study materials",
    "Verbal step-by-step walkthroughs are surfaced first, with written and visual versions one tap away",
  ],
  kinesthetic: [
    "Interactive drag-and-drop and 'try it yourself' prompts are surfaced first",
    "Study sessions default to shorter chunks with active breaks — adjust in Settings",
    "Diagrams, audio, and written explanations remain available on every activity",
  ],
};


// ─── Main scoring function ─────────────────────────────────
export function calculateVAKResult(
  answers: Record<number, VAKStyle>,
  tier: string
): VAKResult {
  const scores = countStyles(answers);
  const ranked = getRankedStyles(scores);
  const primary = ranked[0];
  const secondary = ranked[1];

  let label: string;
  let subType: string | null = null;

  if (tier === "tier_3") {
    const elite = eliteSubType(answers, scores, primary, secondary);
    label = elite.label;
    subType = elite.subType;
  } else if (tier === "tier_2") {
    label = proLabel(scores, primary);
  } else {
    label = freeLabel(scores, primary);
  }

  const isMultimodal = label.includes("Multimodal");
  const description = isMultimodal
    ? MULTIMODAL_DESC
    : DESCRIPTIONS[primary];

  const adaptations = isMultimodal
    ? [
        ...ADAPTATIONS[primary].slice(0, 2),
        ...ADAPTATIONS[secondary].slice(0, 1),
      ]
    : ADAPTATIONS[primary];

  return {
    scores,
    primaryStyle: primary,
    secondaryStyle: secondary,
    label,
    subType,
    description,
    adaptations,
  };
}

export { STYLE_ICONS, STYLE_NAMES };
