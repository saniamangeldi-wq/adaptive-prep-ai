import { useState } from "react";
import { X } from "lucide-react";

interface WorldMapSelectorProps {
  selected: string[];
  onToggle: (country: string) => void;
}

// Simplified SVG world map regions with country data
const COUNTRY_REGIONS: {
  id: string;
  name: string;
  path: string;
  flag: string;
}[] = [
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    path: "M55,95 L130,95 L135,110 L130,130 L110,135 L95,130 L80,135 L55,125 Z",
  },
  {
    id: "ca",
    name: "Canada",
    flag: "🇨🇦",
    path: "M55,50 L145,50 L150,65 L140,80 L130,85 L130,95 L55,95 L50,80 Z",
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    path: "M248,68 L256,64 L258,76 L252,80 Z",
  },
  {
    id: "ie",
    name: "Ireland",
    flag: "🇮🇪",
    path: "M242,68 L248,66 L248,76 L243,76 Z",
  },
  {
    id: "fr",
    name: "France",
    flag: "🇫🇷",
    path: "M252,82 L266,80 L270,92 L260,98 L250,95 Z",
  },
  {
    id: "de",
    name: "Germany",
    flag: "🇩🇪",
    path: "M268,72 L282,70 L284,84 L270,88 L266,80 Z",
  },
  {
    id: "nl",
    name: "Netherlands",
    flag: "🇳🇱",
    path: "M264,70 L272,68 L272,74 L264,76 Z",
  },
  {
    id: "ch",
    name: "Switzerland",
    flag: "🇨🇭",
    path: "M266,88 L276,86 L278,92 L268,94 Z",
  },
  {
    id: "at",
    name: "Austria",
    flag: "🇦🇹",
    path: "M278,84 L292,82 L294,90 L280,92 Z",
  },
  {
    id: "be",
    name: "Belgium",
    flag: "🇧🇪",
    path: "M258,76 L266,76 L266,82 L258,82 Z",
  },
  {
    id: "it",
    name: "Italy",
    flag: "🇮🇹",
    path: "M274,94 L280,90 L290,110 L282,116 L274,108 Z",
  },
  {
    id: "es",
    name: "Spain",
    flag: "🇪🇸",
    path: "M240,96 L262,94 L264,110 L242,112 Z",
  },
  {
    id: "se",
    name: "Sweden",
    flag: "🇸🇪",
    path: "M286,40 L294,38 L298,62 L290,68 L284,55 Z",
  },
  {
    id: "no",
    name: "Norway",
    flag: "🇳🇴",
    path: "M274,36 L286,34 L288,56 L280,60 L274,50 Z",
  },
  {
    id: "dk",
    name: "Denmark",
    flag: "🇩🇰",
    path: "M272,64 L280,62 L282,70 L274,72 Z",
  },
  {
    id: "fi",
    name: "Finland",
    flag: "🇫🇮",
    path: "M298,34 L310,32 L314,54 L302,58 L298,48 Z",
  },
  {
    id: "au",
    name: "Australia",
    flag: "🇦🇺",
    path: "M410,200 L470,195 L480,220 L460,240 L420,238 L405,220 Z",
  },
  {
    id: "nz",
    name: "New Zealand",
    flag: "🇳🇿",
    path: "M490,240 L498,236 L500,252 L492,256 Z",
  },
  {
    id: "jp",
    name: "Japan",
    flag: "🇯🇵",
    path: "M450,95 L458,90 L462,108 L456,115 L448,108 Z",
  },
  {
    id: "kr",
    name: "South Korea",
    flag: "🇰🇷",
    path: "M440,100 L448,96 L450,108 L442,110 Z",
  },
  {
    id: "sg",
    name: "Singapore",
    flag: "🇸🇬",
    path: "M416,160 L422,158 L423,164 L417,165 Z",
  },
  {
    id: "hk",
    name: "Hong Kong",
    flag: "🇭🇰",
    path: "M432,124 L438,122 L439,128 L433,129 Z",
  },
];

export function WorldMapSelector({ selected, onToggle }: WorldMapSelectorProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative w-full rounded-xl bg-muted/30 border border-border/50 overflow-hidden" style={{ minHeight: 280 }}>
        <svg
          viewBox="0 0 540 280"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ minHeight: 280 }}
        >
          {/* Ocean background */}
          <rect width="540" height="280" fill="none" />

          {/* Continent silhouettes (decorative) */}
          <path
            d="M30,40 L160,35 L170,90 L140,145 L55,145 L30,120 Z"
            fill="hsl(var(--muted))"
            opacity="0.3"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
          <path
            d="M230,30 L330,25 L340,60 L320,130 L280,140 L240,120 L225,60 Z"
            fill="hsl(var(--muted))"
            opacity="0.3"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
          <path
            d="M260,150 L310,140 L330,180 L300,230 L270,220 L255,180 Z"
            fill="hsl(var(--muted))"
            opacity="0.3"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
          <path
            d="M340,60 L440,50 L470,100 L460,150 L400,170 L350,140 L340,100 Z"
            fill="hsl(var(--muted))"
            opacity="0.3"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
          <path
            d="M390,185 L490,180 L500,260 L400,260 L385,220 Z"
            fill="hsl(var(--muted))"
            opacity="0.3"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />

          {/* Clickable countries */}
          {COUNTRY_REGIONS.map((country) => {
            const isSelected = selected.includes(country.name);
            const isHovered = hoveredCountry === country.id;

            return (
              <g key={country.id}>
                <path
                  d={country.path}
                  fill={
                    isSelected
                      ? "#00ff88"
                      : isHovered
                      ? "hsl(var(--primary) / 0.5)"
                      : "hsl(var(--muted) / 0.6)"
                  }
                  stroke={
                    isSelected
                      ? "#00ff88"
                      : isHovered
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))"
                  }
                  strokeWidth={isSelected || isHovered ? "1.5" : "0.5"}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredCountry(country.id)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => onToggle(country.name)}
                />
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={parseFloat(country.path.split(" ")[0].replace("M", "")) - 5}
                      y={parseFloat(country.path.split(",")[1].split(" ")[0]) - 18}
                      width={country.name.length * 6 + 24}
                      height="16"
                      rx="4"
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={parseFloat(country.path.split(" ")[0].replace("M", "")) + 7}
                      y={parseFloat(country.path.split(",")[1].split(" ")[0]) - 7}
                      fill="hsl(var(--popover-foreground))"
                      fontSize="8"
                      fontFamily="system-ui"
                    >
                      {country.flag} {country.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected countries as pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((name) => {
            const country = COUNTRY_REGIONS.find((c) => c.name === name);
            return (
              <button
                key={name}
                onClick={() => onToggle(name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
              >
                <span>{country?.flag || "🌍"}</span>
                <span>{name}</span>
                <X className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            );
          })}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Click countries on the map to select them
        </p>
      )}
    </div>
  );
}
