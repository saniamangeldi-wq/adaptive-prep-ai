import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption =
  | "match"
  | "acceptance"
  | "tuition-asc"
  | "ranking";

export interface MatchFilters {
  country: string | null;
  tuitionMax: number | null;
  acceptanceMin: number | null;
  programType: string | null;
}

interface MatchFilterBarProps {
  filters: MatchFilters;
  sortBy: SortOption;
  onFiltersChange: (f: MatchFilters) => void;
  onSortChange: (s: SortOption) => void;
  availableCountries: string[];
  totalResults: number;
}

export function MatchFilterBar({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange,
  availableCountries,
  totalResults,
}: MatchFilterBarProps) {
  const activeFilterCount = [
    filters.country,
    filters.tuitionMax,
    filters.acceptanceMin,
    filters.programType,
  ].filter(Boolean).length;

  const clearAll = () =>
    onFiltersChange({
      country: null,
      tuitionMax: null,
      acceptanceMin: null,
      programType: null,
    });

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border py-3 -mx-1 px-1">
      <div className="flex flex-wrap items-center gap-2">
        {/* Country Filter */}
        <Select
          value={filters.country || "all"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, country: v === "all" ? null : v })
          }
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {availableCountries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tuition Filter */}
        <Select
          value={filters.tuitionMax?.toString() || "any"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              tuitionMax: v === "any" ? null : parseInt(v),
            })
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Tuition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Tuition</SelectItem>
            <SelectItem value="10000">Under $10K</SelectItem>
            <SelectItem value="25000">Under $25K</SelectItem>
            <SelectItem value="50000">Under $50K</SelectItem>
          </SelectContent>
        </Select>

        {/* Acceptance Rate Filter */}
        <Select
          value={filters.acceptanceMin?.toString() || "any"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              acceptanceMin: v === "any" ? null : parseInt(v),
            })
          }
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Acceptance %" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Accept Rate</SelectItem>
            <SelectItem value="50">50%+ Accept</SelectItem>
            <SelectItem value="30">30%+ Accept</SelectItem>
            <SelectItem value="10">10%+ Accept</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 text-xs gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Clear ({activeFilterCount})
          </Button>
        )}

        <div className="flex-1" />

        {/* Results Count */}
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {totalResults} results
        </span>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Best Match %</SelectItem>
            <SelectItem value="acceptance">Acceptance Rate</SelectItem>
            <SelectItem value="tuition-asc">Tuition (Low→High)</SelectItem>
            <SelectItem value="ranking">World Ranking</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
