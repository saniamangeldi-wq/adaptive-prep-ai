interface ReferencesBadgeProps {
  count: number;
  label?: string;
  onClick?: () => void;
}

export function ReferencesBadge({ count, label = "sources active", onClick }: ReferencesBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground bg-primary/5 border border-primary/10 hover:border-primary/20 transition-colors"
    >
      <span>📚</span>
      <span>
        {count} {label}
      </span>
    </button>
  );
}
