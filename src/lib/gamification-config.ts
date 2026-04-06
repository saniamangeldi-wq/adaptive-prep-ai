// XP Level definitions
export interface LevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: "Beginner", xpRequired: 0, icon: "🌱" },
  { level: 2, title: "Learner", xpRequired: 100, icon: "📖" },
  { level: 3, title: "Explorer", xpRequired: 300, icon: "🔍" },
  { level: 4, title: "Achiever", xpRequired: 600, icon: "⭐" },
  { level: 5, title: "Scholar", xpRequired: 1000, icon: "🎓" },
  { level: 6, title: "Expert", xpRequired: 1500, icon: "💡" },
  { level: 7, title: "Champion", xpRequired: 2200, icon: "🏅" },
  { level: 8, title: "Master", xpRequired: 3000, icon: "🏆" },
  { level: 9, title: "Legend", xpRequired: 4000, icon: "🌟" },
  { level: 10, title: "Grandmaster", xpRequired: 5500, icon: "👑" },
];

// XP rewards for actions
export const XP_REWARDS = {
  complete_test: 50,
  ai_chat_message: 5,
  flashcard_study: 15,
  streak_day: 20,
  daily_challenge: 25,
  daily_hat_trick: 50, // Bonus for completing all 3 daily challenges
  perfect_test: 100,
} as const;

// Milestone titles unlocked at certain XP
export interface MilestoneReward {
  xpThreshold: number;
  title: string;
  icon: string;
  description: string;
}

export const MILESTONE_REWARDS: MilestoneReward[] = [
  { xpThreshold: 100, title: "Rising Star", icon: "⭐", description: "Earned 100 XP" },
  { xpThreshold: 500, title: "Knowledge Seeker", icon: "🔎", description: "Earned 500 XP" },
  { xpThreshold: 1000, title: "SAT Warrior", icon: "⚔️", description: "Earned 1,000 XP" },
  { xpThreshold: 2000, title: "Study Hero", icon: "🦸", description: "Earned 2,000 XP" },
  { xpThreshold: 3000, title: "Academic Elite", icon: "💎", description: "Earned 3,000 XP" },
  { xpThreshold: 5000, title: "Grandmaster Scholar", icon: "👑", description: "Earned 5,000 XP" },
];

// Daily challenge templates
export const CHALLENGE_TEMPLATES = [
  { type: "complete_test", title: "Test Taker", description: "Complete a practice test", requirement: 1 },
  { type: "ai_chat", title: "Ask the Coach", description: "Send 3 messages to the AI coach", requirement: 3 },
  { type: "flashcard_study", title: "Card Shark", description: "Study a flashcard deck", requirement: 1 },
  { type: "streak_login", title: "Show Up", description: "Log in and study today", requirement: 1 },
  { type: "perfect_question", title: "Precision", description: "Answer 5 questions correctly", requirement: 5 },
] as const;

export function getLevelForXP(xp: number): LevelDefinition {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(currentLevel: number): LevelDefinition | null {
  const idx = LEVELS.findIndex(l => l.level === currentLevel);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
}

export function getXPProgress(xp: number): { current: number; needed: number; percentage: number } {
  const currentLevel = getLevelForXP(xp);
  const nextLevel = getNextLevel(currentLevel.level);
  if (!nextLevel) return { current: xp, needed: xp, percentage: 100 };
  
  const xpIntoLevel = xp - currentLevel.xpRequired;
  const xpForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  return {
    current: xpIntoLevel,
    needed: xpForNextLevel,
    percentage: Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)),
  };
}

export function getUnlockedMilestones(xp: number): MilestoneReward[] {
  return MILESTONE_REWARDS.filter(m => xp >= m.xpThreshold);
}
