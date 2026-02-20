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

  if (primary === "visual") {
    const spatialCount = SPATIAL_VISUAL_QS.filter(
      (q) => answers[q - 1] === "visual" // answers are 0-indexed by question index
    ).length;
    // Check using question IDs
    const spatialCountById = SPATIAL_VISUAL_QS.filter(
      (qId) => {
        // Find the answer for this question ID
        const entry = Object.entries(answers).find(([, ]) => {
          return false; // We'll use a different approach
        });
        return false;
      }
    ).length;
    
    // Actually, answers are keyed by question index (0-based), questions have IDs (1-based)
    // So answer at index i corresponds to question ID i+1
    const spatialHits = SPATIAL_VISUAL_QS.filter(
      (qId) => answers[qId - 1] === "visual"
    ).length;
    const totalSpatialAnswered = SPATIAL_VISUAL_QS.filter(
      (qId) => answers[qId - 1] !== undefined
    ).length;
    
    if (totalSpatialAnswered > 0 && spatialHits / totalSpatialAnswered > 0.5) {
      return {
        label: "Spatial Visual Learner",
        subType: "spatial_visual",
      };
    }
    return {
      label: "Verbal Visual Learner",
      subType: "verbal_visual",
    };
  }

  if (primary === "auditory") {
    const expressiveHits = EXPRESSIVE_AUDITORY_QS.filter(
      (qId) => answers[qId - 1] === "auditory"
    ).length;
    const totalExpressiveAnswered = EXPRESSIVE_AUDITORY_QS.filter(
      (qId) => answers[qId - 1] !== undefined
    ).length;
    
    if (totalExpressiveAnswered > 0 && expressiveHits / totalExpressiveAnswered > 0.5) {
      return {
        label: "Expressive Auditory Learner",
        subType: "expressive_auditory",
      };
    }
    return {
      label: "Receptive Auditory Learner",
      subType: "receptive_auditory",
    };
  }

  if (primary === "kinesthetic") {
    const physicalHits = PHYSICAL_KINESTHETIC_QS.filter(
      (qId) => answers[qId - 1] === "kinesthetic"
    ).length;
    const totalPhysicalAnswered = PHYSICAL_KINESTHETIC_QS.filter(
      (qId) => answers[qId - 1] !== undefined
    ).length;
    
    if (totalPhysicalAnswered > 0 && physicalHits / totalPhysicalAnswered > 0.5) {
      return {
        label: "Physical Kinesthetic Learner",
        subType: "physical_kinesthetic",
      };
    }
    return {
      label: "Tactile Kinesthetic Learner",
      subType: "tactile_kinesthetic",
    };
  }

  return { label: `${STYLE_NAMES[primary]} Learner`, subType: primary };
}

// ─── Descriptions ──────────────────────────────────────────
const DESCRIPTIONS: Record<VAKStyle, string> = {
  visual:
    "You learn best through images, diagrams, and visual representations. Your brain processes information most effectively when you can see it laid out in front of you.",
  auditory:
    "You absorb information best through listening and verbal communication. Hearing explanations and discussing concepts helps you understand and retain knowledge.",
  kinesthetic:
    "You learn by doing — hands-on practice and physical engagement are your strongest tools. Movement and tactile experiences make concepts stick for you.",
};

const MULTIMODAL_DESC =
  "You have a balanced learning profile, drawing on multiple styles equally. This flexibility means you can adapt to different learning situations with ease.";

// ─── Adaptations ───────────────────────────────────────────
const ADAPTATIONS: Record<VAKStyle, string[]> = {
  visual: [
    "Diagrams and charts are prioritized in all AI explanations",
    "Flashcards default to image + word format with color coding",
    "Visual progress bars and mind maps are enabled throughout",
  ],
  auditory: [
    "Text-to-speech is enabled by default on all content",
    "Read-aloud buttons appear prominently on study materials",
    "Verbal step-by-step walkthroughs are prioritized",
  ],
  kinesthetic: [
    "Interactive drag-and-drop exercises are prioritized",
    "Study sessions are broken into shorter chunks with active breaks",
    "'Try it yourself' prompts appear before explanations",
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
