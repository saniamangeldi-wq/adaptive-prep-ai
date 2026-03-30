import { BookOpenCheck, LucideIcon } from "lucide-react";

interface GuideHeaderProps {
  role: string;
  icon: LucideIcon;
  subtitle: string;
}

export function GuideHeader({ role, icon: Icon, subtitle }: GuideHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{role} Guide</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <BookOpenCheck className="w-4 h-4" />
          Read through each section to understand your features and best practices.
        </div>
      </div>
    </div>
  );
}
