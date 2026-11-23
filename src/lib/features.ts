/**
 * Feature switches for the relaunch (see salvage/90-DAY-PLAN.md).
 * Frozen features keep their code but are hidden from navigation and their
 * routes redirect to the dashboard. Flip to true to bring one back.
 */
export const FEATURES = {
  /** 200-university dataset is AI-written and unverified; return only after verification. */
  universityMatch: false,
  /** Duplicates assignments; no clear job for paying users yet. */
  spaces: false,
  /** Gamification polish; not part of the paid offer. */
  tutorLeaderboard: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Route paths owned by each frozen feature, used by navigation filtering. */
export const FEATURE_ROUTES: Record<string, FeatureKey> = {
  "/dashboard/university-match": "universityMatch",
  "/dashboard/spaces": "spaces",
  "/dashboard/leaderboard": "tutorLeaderboard",
};

export function isRouteEnabled(href: string): boolean {
  const key = FEATURE_ROUTES[href];
  return key ? FEATURES[key] : true;
}
