import {
  Brain,
  Target,
  LineChart,
  Layers,
  MessageSquare,
  Zap,
  GraduationCap,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function Features() {
  const { t } = useTranslation();

  const features = [
    { icon: Brain, titleKey: "features.adaptive_title", descKey: "features.adaptive_desc", color: "from-primary to-teal-400" },
    { icon: Target, titleKey: "features.style_title", descKey: "features.style_desc", color: "from-accent to-orange-400" },
    { icon: LineChart, titleKey: "features.progress_title", descKey: "features.progress_desc", color: "from-info to-blue-400" },
    { icon: Layers, titleKey: "features.flexible_title", descKey: "features.flexible_desc", color: "from-success to-emerald-400" },
    { icon: MessageSquare, titleKey: "features.coach_title", descKey: "features.coach_desc", color: "from-purple-500 to-pink-400" },
    { icon: Zap, titleKey: "features.flashcards_title", descKey: "features.flashcards_desc", color: "from-warning to-yellow-400" },
    { icon: GraduationCap, titleKey: "features.coverage_title", descKey: "features.coverage_desc", color: "from-rose-500 to-red-400" },
    { icon: Clock, titleKey: "features.timed_title", descKey: "features.timed_desc", color: "from-cyan-500 to-teal-400" },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("features.heading")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("features.subheading")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.titleKey}
              icon={feature.icon}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              color={feature.color}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
