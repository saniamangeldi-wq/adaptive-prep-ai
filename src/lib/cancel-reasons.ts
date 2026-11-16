/**
 * Reasons offered in the cancel dialog. The values must be in the REASONS list of
 * supabase/functions/cancel-subscription/index.ts (anything else is stored as "other").
 */
export const CANCEL_REASONS: { value: string; label: string }[] = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "found_alternative", label: "I found another platform" },
  { value: "finished_prep", label: "I finished my IELTS prep" },
  { value: "technical_issues", label: "Technical problems or bugs" },
  { value: "other", label: "Other" },
];
