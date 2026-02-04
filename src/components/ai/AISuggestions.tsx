import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface AISuggestionsProps {
  subject?: string;
  onSelectSuggestion: (text: string) => void;
  className?: string;
}

export function AISuggestions({ 
  subject = "SAT", 
  onSelectSuggestion,
  className 
}: AISuggestionsProps) {
  const { suggestions, loading, refresh } = useAISuggestions(subject, 4);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Try asking...</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Try asking...</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Get new suggestions"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelectSuggestion(suggestion.suggestion_text)}
            className="p-3 text-sm text-left rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-primary/30 transition-all duration-200"
          >
            {suggestion.suggestion_text}
          </button>
        ))}
      </div>
    </div>
  );
}
