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

/** "About 3 essay checks a day, or 15 chat messages". */
export function planUsage(tierId: string): string {
  const a = allowanceForTier(tierId);
  return `About ${plural(a.essayChecks, "essay check", "essay checks")} a day, or ${plural(a.chatMessages, "chat message", "chat messages")}`;
}

/** Bullet points for a plan card. Every number comes from the constants. */
export function planFeatureLines(tierId: string): string[] {
  const a = allowanceForTier(tierId);
  return [
    `${a.dailyCredits} AI credits every day`,
    planUsage(tierId),
    `An essay check costs ${plural(CREDIT_COST.grade, "credit", "credits")}, a chat message ${plural(CREDIT_COST.chat, "credit", "credits")}`,
    "Credits reset every day",
  ];
}

/** What each kind of call costs, for the billing page. Numbers come from CREDIT_COST. */
export function creditCostLines(): string[] {
  return [
    `Essay check: ${plural(CREDIT_COST.grade, "credit", "credits")}`,
    `Essay check with a model answer: ${plural(CREDIT_COST.gradeWithModelAnswer, "credit", "credits")}`,
    `New practice task (when it is not in the task bank): ${plural(CREDIT_COST.generateTask, "credit", "credits")}`,
    `Chat message: ${plural(CREDIT_COST.chat, "credit", "credits")}`,
  ];
}
