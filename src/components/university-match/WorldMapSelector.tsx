import { useState, memo } from "react";
import { X } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

interface WorldMapSelectorProps {
  selected: string[];
  onToggle: (country: string) => void;
  onCountryClick?: (country: string) => void;
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map from topojson country names to our display names + flags
const COUNTRY_FLAGS: Record<string, string> = {
  "United States of America": "🇺🇸",
  "Canada": "🇨🇦",
  "United Kingdom": "🇬🇧",
  "Ireland": "🇮🇪",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Netherlands": "🇳🇱",
  "Switzerland": "🇨🇭",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Denmark": "🇩🇰",
  "Finland": "🇫🇮",
  "Australia": "🇦🇺",
  "New Zealand": "🇳🇿",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "Singapore": "🇸🇬",
};

// Normalize topojson names to our canonical names
function normalizeCountryName(name: string): string {
  if (name === "United States of America") return "United States";
  return name;
}

const MemoizedGeography = memo(({ geo, isSelected, isHovered, onMouseEnter, onMouseLeave, onClick }: {
  geo: any;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) => (
  <Geography
    geography={geo}
    fill={isSelected ? "#00ff88" : isHovered ? "#20c997" : "#1e2a2a"}
    stroke="#2a3a3a"
    strokeWidth={0.5}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
    style={{
      default: { outline: "none", cursor: isSelectable(geo) ? "pointer" : "default" },
      hover: { outline: "none" },
      pressed: { outline: "none" },
    }}
  />
));

function isSelectable(geo: any): boolean {
  const name = geo.properties.name;
  return name === "United States of America" || name in COUNTRY_FLAGS;
}

export function WorldMapSelector({ selected, onToggle, onCountryClick }: WorldMapSelectorProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div className="relative w-full rounded-xl bg-[#0d1717] border border-border/50 overflow-hidden" style={{ minHeight: 280 }}>
        <ComposableMap
          projectionConfig={{ scale: 147, center: [0, 20] }}
          width={800}
          height={400}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoName = geo.properties.name;
                  const displayName = normalizeCountryName(geoName);
                  const isSelected = selected.includes(displayName);
                  const isHovered = hoveredCountry === geoName;
                  const selectable = isSelectable(geo);

                  return (
                    <MemoizedGeography
                      key={geo.rsmKey}
                      geo={geo}
                      isSelected={isSelected}
                      isHovered={selectable && isHovered}
                      onMouseEnter={() => selectable && setHoveredCountry(geoName)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => selectable && onToggle(displayName)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {hoveredCountry && isSelectableByName(hoveredCountry) && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-popover border border-border text-popover-foreground text-xs font-medium pointer-events-none">
            {COUNTRY_FLAGS[hoveredCountry] || "🌍"} {normalizeCountryName(hoveredCountry)}
          </div>
        )}
      </div>

      {/* Selected countries as pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map((name) => {
            const flag = COUNTRY_FLAGS[name] || COUNTRY_FLAGS[name === "United States" ? "United States of America" : name] || "🌍";
            return (
              <button
                key={name}
                onClick={() => onToggle(name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
              >
                <span>{flag}</span>
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

function isSelectableByName(name: string): boolean {
  return name === "United States of America" || name in COUNTRY_FLAGS;
}
