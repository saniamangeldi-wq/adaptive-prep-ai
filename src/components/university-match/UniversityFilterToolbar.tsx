import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X, RefreshCw, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export type UniversitySortOption =
  | "qs-rank"
  | "acceptance-high"
  | "acceptance-low"
  | "tuition-asc"
  | "tuition-desc"
  | "scholarship";

export interface UniversityFilters {
  search: string;
  scholarshipOnly: boolean;
  region: string | null;
  acceptanceRange: string | null;
  tuitionRange: string | null;
}

const REGION_MAP: Record<string, string[]> = {
  "Europe": ["United Kingdom", "Germany", "France", "Netherlands", "Switzerland", "Sweden", "Denmark", "Norway", "Finland", "Austria", "Belgium", "Italy", "Spain", "Ireland", "Poland", "Czech Republic", "Portugal", "Russia", "Hungary", "Romania", "Greece"],
  "North America": ["United States", "Canada"],
  "Asia": ["Japan", "South Korea", "Singapore", "China", "Hong Kong", "India", "Taiwan", "Malaysia", "Thailand", "Indonesia", "Philippines", "Vietnam", "Pakistan", "Bangladesh"],
  "Middle East": ["UAE", "United Arab Emirates", "Saudi Arabia", "Qatar", "Israel", "Turkey", "Lebanon", "Jordan", "Oman", "Bahrain", "Kuwait"],
  "Oceania": ["Australia", "New Zealand"],
  "Africa": ["South Africa", "Egypt", "Nigeria", "Kenya", "Ghana", "Morocco", "Tunisia"],
  "Latin America": ["Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru"],
  "Central Asia": ["Kazakhstan", "Uzbekistan", "Kyrgyzstan"],
};

export function getRegionForCountry(country: string): string | null {
  for (const [region, countries] of Object.entries(REGION_MAP)) {
    if (countries.includes(country)) return region;
  }
  return null;
}

interface UniversityFilterToolbarProps {
  filters: UniversityFilters;
  sortBy: UniversitySortOption;
  onFiltersChange: (f: UniversityFilters) => void;
  onSortChange: (s: UniversitySortOption) => void;
  totalResults: number;
  onRefreshScholarships: () => void;
  refreshing: boolean;
  lastRefreshed: string | null;
}

export function UniversityFilterToolbar({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange,
  totalResults,
  onRefreshScholarships,
  refreshing,
  lastRefreshed,
}: UniversityFilterToolbarProps) {
  const hasActiveFilters = filters.scholarshipOnly || filters.region || filters.acceptanceRange || filters.tuitionRange || filters.search;

  const clearAll = () =>
    onFiltersChange({
      search: "",
      scholarshipOnly: false,
      region: null,
      acceptanceRange: null,
      tuitionRange: null,
    });

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border py-3 space-y-3">
      {/* Row 1: Search + Sort + Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search universities, countries, or cities..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 h-8 text-xs"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as UniversitySortOption)}>
          <SelectTrigger className="w-[190px] h-8 text-xs">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qs-rank">QS Ranking</SelectItem>
            <SelectItem value="acceptance-high">Acceptance Rate (High→Low)</SelectItem>
            <SelectItem value="acceptance-low">Acceptance Rate (Low→High)</SelectItem>
            <SelectItem value="tuition-asc">Tuition (Low→High)</SelectItem>
            <SelectItem value="tuition-desc">Tuition (High→Low)</SelectItem>
            <SelectItem value="scholarship">Best for Scholarships</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground hidden sm:inline">
          Showing {totalResults} universities
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white"
            onClick={onRefreshScholarships}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
            Refresh Scholarship Data
          </Button>
        </div>
      </div>

      {/* Row 2: Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Scholarship toggle */}
        <button
          onClick={() => onFiltersChange({ ...filters, scholarshipOnly: !filters.scholarshipOnly })}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5",
            filters.scholarshipOnly
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          🎓 Full Scholarship Only
        </button>

        {/* Region */}
        <Select
          value={filters.region || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, region: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[140px] h-7 text-xs rounded-full">
            <span>🌍</span>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {Object.keys(REGION_MAP).map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Acceptance Rate */}
        <Select
          value={filters.acceptanceRange || "any"}
          onValueChange={(v) => onFiltersChange({ ...filters, acceptanceRange: v === "any" ? null : v })}
        >
          <SelectTrigger className="w-[140px] h-7 text-xs rounded-full">
            <span>📊</span>
            <SelectValue placeholder="Acceptance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Accept Rate</SelectItem>
            <SelectItem value="under10">Under 10%</SelectItem>
            <SelectItem value="10to30">10–30%</SelectItem>
            <SelectItem value="30to60">30–60%</SelectItem>
            <SelectItem value="over60">Over 60%</SelectItem>
          </SelectContent>
        </Select>

        {/* Tuition */}
        <Select
          value={filters.tuitionRange || "any"}
          onValueChange={(v) => onFiltersChange({ ...filters, tuitionRange: v === "any" ? null : v })}
        >
          <SelectTrigger className="w-[140px] h-7 text-xs rounded-full">
            <span>💰</span>
            <SelectValue placeholder="Tuition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Tuition</SelectItem>
            <SelectItem value="under10k">Under $10K</SelectItem>
            <SelectItem value="10to25k">$10K–$25K</SelectItem>
            <SelectItem value="25to50k">$25K–$50K</SelectItem>
            <SelectItem value="over50k">Over $50K</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-[10px] text-muted-foreground">
          Scholarship data last updated: {new Date(lastRefreshed).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-4xl mb-4">🎓</span>
      <h3 className="text-foreground font-semibold text-lg mb-2">
        No universities match your filters
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        Try adjusting your acceptance rate, region, or scholarship filter
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white"
      >
        Clear All Filters
      </Button>
    </div>
  );
}
