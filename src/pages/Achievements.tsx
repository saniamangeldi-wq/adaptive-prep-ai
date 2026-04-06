import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useXPLevel } from "@/hooks/useXPLevel";
import { useBadges } from "@/hooks/useBadges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LEVELS, MILESTONE_REWARDS } from "@/lib/gamification-config";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, Star, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Achievements() {
  const { user } = useAuth();
  const { levelData, currentLevel, nextLevel, xpProgress } = useXPLevel();
  const { earnedBadges, allBadges } = useBadges();
  const { entries: leaderboard, isLoading: lbLoading } = useLeaderboard();

  const myRank = leaderboard.findIndex(e => e.student_id === user?.id) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Hero Level Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-4xl">
              {currentLevel.icon}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground">
                Level {currentLevel.level} — {currentLevel.title}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <Zap className="w-4 h-4 text-yellow-500" />
                {levelData.xp} XP total
                {myRank > 0 && <span className="ml-2">• Rank #{myRank}</span>}
              </p>
              <div className="mt-3 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  {nextLevel && (
                    <span className="text-muted-foreground">
                      {xpProgress.current}/{xpProgress.needed} XP
                    </span>
                  )}
                </div>
                <Progress value={xpProgress.percentage} className="h-3" />
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="badges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="badges" className="flex items-center gap-1">
              <Star className="w-4 h-4" /> Badges
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-1">
              <Crown className="w-4 h-4" /> Milestones
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Achievement Badges</h2>
              <span className="text-sm text-muted-foreground">{earnedBadges.length}/{allBadges.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allBadges.map(badge => {
                const isEarned = earnedBadges.some(b => b.badge_type === badge.type);
                return (
                  <div
                    key={badge.type}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      isEarned
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "bg-secondary/30 border-border/30 opacity-50 grayscale"
                    }`}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="text-sm font-medium text-foreground">{badge.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{badge.description}</p>
                    {isEarned && (
                      <span className="text-[10px] text-primary font-medium mt-2 block">✓ Earned</span>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">XP Milestones & Titles</h2>
            
            {/* Level Progression */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Levels</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {LEVELS.map(level => {
                  const reached = levelData.level >= level.level;
                  return (
                    <div
                      key={level.level}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        reached
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/30 opacity-50"
                      }`}
                    >
                      <div className="text-xl">{level.icon}</div>
                      <div className="text-xs font-medium text-foreground mt-1">Lv.{level.level}</div>
                      <div className="text-[10px] text-muted-foreground">{level.title}</div>
                      <div className="text-[10px] text-muted-foreground">{level.xpRequired} XP</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Title Rewards */}
            <div className="space-y-2 mt-6">
              <h3 className="text-sm font-medium text-muted-foreground">Unlockable Titles</h3>
              <div className="space-y-2">
                {MILESTONE_REWARDS.map(milestone => {
                  const unlocked = levelData.xp >= milestone.xpThreshold;
                  return (
                    <div
                      key={milestone.title}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        unlocked
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/30 opacity-60"
                      }`}
                    >
                      <span className="text-2xl">{unlocked ? milestone.icon : "🔒"}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">{milestone.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{milestone.description}</p>
                      </div>
                      {unlocked ? (
                        <span className="text-xs text-primary font-medium">Unlocked</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{milestone.xpThreshold} XP</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Community Champions</h2>
              <span className="text-sm text-muted-foreground">Top students by XP</span>
            </div>

            {lbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No entries yet. Start earning XP to appear here!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.student_id === user?.id;
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                  return (
                    <div
                      key={entry.student_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isMe
                          ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                          : "bg-card border-border/50"
                      }`}
                    >
                      <span className="w-8 text-center font-bold text-sm text-muted-foreground">
                        {medal || `#${idx + 1}`}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-secondary">
                          {(entry.full_name || "S").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {entry.full_name || "Student"}
                          {isMe && <span className="text-xs text-primary ml-1">(You)</span>}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Level {entry.level} • {entry.rank_title}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        {entry.xp}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
