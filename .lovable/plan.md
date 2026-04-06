## Gamification System Plan

### 1. Database Changes
- **`student_levels`** table — tracks XP, current level, and rank title per student
- **`daily_challenges`** table — stores generated daily tasks with XP rewards
- **`daily_challenge_completions`** table — tracks which challenges a student completed
- Add XP level definitions as constants (Level 1: 0 XP "Beginner", Level 5: 500 XP "Scholar", Level 10: 2000 XP "Master", etc.)

### 2. XP Levels & Ranks
- **10 levels**: Beginner → Learner → Explorer → Achiever → Scholar → Expert → Champion → Master → Legend → Grandmaster
- XP earned from: tests (+50), AI chats (+10), flashcard study (+15), streak days (+20), challenges (+varies)
- Visual progress bar showing XP to next level on student dashboard
- Rank badge displayed on profile

### 3. Daily Challenges
- 3 auto-generated challenges per day (e.g., "Complete 1 practice test", "Study flashcards for 10 min", "Ask the AI coach a question")
- Bonus XP for completing all 3 ("Daily Hat Trick" bonus)
- Challenges reset at midnight UTC
- Small challenge widget on dashboard

### 4. Leaderboard
- Weekly leaderboard showing top students by XP
- Filterable by school (for school members) or global
- Podium display (🥇🥈🥉) for top 3
- Collaborative tone: "Community Champions" header, focus on growth not competition

### 5. Milestone Rewards & Unlockables  
- Unlock titles at XP thresholds (e.g., "SAT Warrior" at 1000 XP, "Knowledge Seeker" at 2500 XP)
- Milestone celebrations with confetti/toast when leveling up
- Reward history visible in profile

### 6. UI Integration
- **Dashboard widget**: XP bar + level + daily challenges
- **New "Achievements" page**: badges, milestones, leaderboard tabs
- Integrate with existing streak/badge system

### Implementation Order
1. Database migration (tables + RLS)
2. XP & Levels hook + daily challenges logic
3. Dashboard gamification widget
4. Achievements page with leaderboard
5. Wire up XP earning across existing features
