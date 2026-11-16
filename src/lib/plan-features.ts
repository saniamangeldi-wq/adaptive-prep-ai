import { CREDIT_COST } from "@ielts/contract";
import { TIER_DAILY_CREDITS } from "@ielts/credits";

/**
 * What a plan buys, derived from the server's own constants
 * (TIER_DAILY_CREDITS in credits.ts, CREDIT_COST in contract.ts)
 * so the pricing page can never drift from what the server enforces.
 */

export interface PlanAllowance {
  dailyCredits: number;
  essayChecks: number;
  chatMessages: number;
}

export function allowanceForCredits(dailyCredits: number): PlanAllowance {
  return {
    dailyCredits,
    essayChecks: Math.floor(dailyCredits / CREDIT_COST.grade),
    chatMessages: Math.floor(dailyCredits / CREDIT_COST.chat),
  };
}

export function allowanceForTier(tierId: string): PlanAllowance {
  return allowanceForCredits(TIER_DAILY_CREDITS[tierId] ?? TIER_DAILY_CREDITS.tier_0);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Bullet points for a plan card. Every number comes from the constants. */
export function planFeatureLines(tierId: string): string[] {
  const a = allowanceForTier(tierId);
  return [
    `${a.dailyCredits} AI credits every day`,
    `About ${plural(a.essayChecks, "essay check", "essay checks")} a day, or ${plural(a.chatMessages, "chat message", "chat messages")}`,
    `An essay check costs ${plural(CREDIT_COST.grade, "credit", "credits")}, a chat message ${plural(CREDIT_COST.chat, "credit", "credits")}`,
    "Credits reset every day",
  ];
}

/** One-line summary, for the billing page. */
export function planSummary(tierId: string): string {
  const a = allowanceForTier(tierId);
  return `${a.dailyCredits} credits a day: about ${plural(a.essayChecks, "essay check", "essay checks")} or ${plural(a.chatMessages, "chat message", "chat messages")}.`;
}
