import { useXPLevel } from "@/hooks/useXPLevel";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export function GamificationWidget() {
  const { t } = useTranslation();
  const { levelData, currentLevel, nextLevel, xpProgress, isLoading: levelLoading } = useXPLevel();
  const { challenges, completedCount, totalChallenges, allCompleted, isLoading: challengeLoading } = useDailyChallenges();

  if (levelLoading || challengeLoading) {
    return (
      <div className="p-5 rounded-xl bg-card border border-border/50 animate-pulse">
        <div className="h-24" />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* XP & Level Card */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentLevel.icon}</span>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{t("dashboard.level")} {currentLevel.level}</h3>
              <p className="text-xs text-muted-foreground">{currentLevel.title}</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard/achievements"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Trophy className="w-3 h-3" />
                {t("dashboard.view_all")}
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("dashboard.view_all_tooltip")}</TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              {levelData.xp} XP
            </span>
            {nextLevel && (
              <span className="text-muted-foreground">
                {nextLevel.xpRequired - levelData.xp} {t("dashboard.xp_to_level")} {nextLevel.level}
              </span>
            )}
          </div>
          <Progress value={xpProgress.percentage} className="h-2" />
          {!nextLevel && (
            <p className="text-xs text-primary font-medium">{t("dashboard.max_level")}</p>
          )}
        </div>
      </div>

      {/* Daily Challenges Card */}
      <div className="p-5 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Daily Challenges
          </h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalChallenges}
          </span>
        </div>

        <div className="space-y-2">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
                challenge.completed
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              {challenge.completed ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="flex-1">{challenge.title}</span>
              <span className="text-[10px] font-medium">+{challenge.xp_reward} XP</span>
            </div>
          ))}
          {allCompleted && (
            <div className="text-xs text-center text-primary font-medium mt-1">
              🎉 All done! +50 bonus XP
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
