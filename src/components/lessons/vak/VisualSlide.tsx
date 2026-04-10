import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { WordTimestamp } from "../LessonPlayer";

interface DiagramData {
  type: "flowchart" | "comparison_table" | "concept_map" | "timeline" | "bar_chart" | "pie_chart";
  title: string;
  description: string;
  data: Array<{ label: string; value?: number; color?: string; children?: string[]; connections?: string[] }>;
}

interface VisualSlideProps {
  slide: {
    heading: string;
    subheading?: string;
    bullets?: string[];
    highlight_terms?: string[];
    equation?: string;
    code_snippet?: string;
    note?: string;
    diagram?: DiagramData;
  };
  isNarrating: boolean;
  narrationProgress: number;
  currentTime: number;
  wordTimestamps: WordTimestamp[];
  getBulletState: (idx: number) => "visible" | "revealed" | "active" | "hidden";
  bulletRanges: Array<{ startIdx: number; endIdx: number; startTime: number; endTime: number } | null>;
  renderBulletContent: (bullet: string, idx: number, state: string) => React.ReactNode;
}

function FlowchartDiagram({ data, isActive }: { data: DiagramData["data"]; isActive: boolean }) {
  const nodeWidth = 140;
  const nodeHeight = 40;
  const gap = 60;
  const svgWidth = Math.min(data.length * (nodeWidth + gap), 400);
  const svgHeight = data.length * (nodeHeight + 30) + 20;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-64">
      {data.map((item, i) => {
        const x = svgWidth / 2 - nodeWidth / 2;
        const y = i * (nodeHeight + 30) + 10;
        return (
          <g key={i} className={cn("transition-all duration-500", isActive ? "opacity-100" : "opacity-0")} style={{ transitionDelay: `${i * 150}ms` }}>
            {i > 0 && (
              <line x1={svgWidth / 2} y1={y - 20} x2={svgWidth / 2} y2={y} className="stroke-primary/40" strokeWidth={2} markerEnd="url(#arrow)" />
            )}
            <rect x={x} y={y} width={nodeWidth} height={nodeHeight} rx={8} className="fill-primary/10 stroke-primary/30" strokeWidth={1.5} />
            <text x={svgWidth / 2} y={y + nodeHeight / 2 + 4} textAnchor="middle" className="fill-foreground text-[10px] font-medium">{item.label}</text>
          </g>
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-auto">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary/40" />
        </marker>
      </defs>
    </svg>
  );
}

function ComparisonTable({ data, isActive }: { data: DiagramData["data"]; isActive: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary/20">
            <th className="px-3 py-2 text-left font-semibold text-foreground">Item</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Details</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              className={cn(
                "border-t border-border transition-all duration-500",
                i % 2 === 0 ? "bg-muted/20" : "bg-card",
                isActive ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
              )}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <td className="px-3 py-2 font-medium text-foreground">{item.label}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {item.children?.join(", ") || (item.value !== undefined ? String(item.value) : "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConceptMap({ data, isActive }: { data: DiagramData["data"]; isActive: boolean }) {
  if (data.length === 0) return null;
  const center = data[0];
  const satellites = data.slice(1);
  const cx = 150, cy = 100, radius = 70;

  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-56">
      {/* Center node */}
      <g className={cn("transition-all duration-500", isActive ? "opacity-100" : "opacity-0")}>
        <circle cx={cx} cy={cy} r={28} className="fill-primary/20 stroke-primary" strokeWidth={2} />
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-[9px] font-bold">{center.label}</text>
      </g>
      {/* Satellite nodes */}
      {satellites.map((item, i) => {
        const angle = (2 * Math.PI * i) / satellites.length - Math.PI / 2;
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        return (
          <g key={i} className={cn("transition-all duration-500", isActive ? "opacity-100" : "opacity-0")} style={{ transitionDelay: `${(i + 1) * 150}ms` }}>
            <line x1={cx} y1={cy} x2={sx} y2={sy} className="stroke-primary/30" strokeWidth={1} />
            <circle cx={sx} cy={sy} r={20} className="fill-muted stroke-border" strokeWidth={1} />
            <text x={sx} y={sy + 3} textAnchor="middle" className="fill-foreground text-[8px]">{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TimelineDiagram({ data, isActive }: { data: DiagramData["data"]; isActive: boolean }) {
  return (
    <div className="space-y-0 relative pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-primary/30" />
      {data.map((item, i) => (
        <div
          key={i}
          className={cn("flex items-start gap-3 py-2 transition-all duration-500", isActive ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[-8px]")}
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          <div className="h-3.5 w-3.5 rounded-full bg-primary shrink-0 mt-0.5 ring-2 ring-primary/20 relative z-10" />
          <div>
            <p className="text-xs font-semibold text-foreground">{item.label}</p>
            {item.children?.[0] && <p className="text-[10px] text-muted-foreground">{item.children[0]}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BarChartDiagram({ data, isActive }: { data: DiagramData["data"]; isActive: boolean }) {
  const maxVal = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div className="flex items-end gap-2 h-40 px-2">
      {data.map((item, i) => {
        const pct = ((item.value || 0) / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex-1 flex items-end">
              <div
                className={cn("w-full rounded-t bg-primary/70 transition-all duration-700", isActive ? "" : "!h-0")}
                style={{ height: isActive ? `${pct}%` : "0%", transitionDelay: `${i * 100}ms` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DiagramRenderer({ diagram, isActive }: { diagram: DiagramData; isActive: boolean }) {
  switch (diagram.type) {
    case "flowchart": return <FlowchartDiagram data={diagram.data} isActive={isActive} />;
    case "comparison_table": return <ComparisonTable data={diagram.data} isActive={isActive} />;
    case "concept_map": return <ConceptMap data={diagram.data} isActive={isActive} />;
    case "timeline": return <TimelineDiagram data={diagram.data} isActive={isActive} />;
    case "bar_chart": return <BarChartDiagram data={diagram.data} isActive={isActive} />;
    case "pie_chart": return <BarChartDiagram data={diagram.data} isActive={isActive} />; // reuse bar for MVP
    default: return <p className="text-xs text-muted-foreground italic">{diagram.description}</p>;
  }
}

export function VisualSlide({
  slide,
  isNarrating,
  narrationProgress,
  currentTime,
  wordTimestamps,
  getBulletState,
  bulletRanges,
  renderBulletContent,
}: VisualSlideProps) {
  const diagram = slide.diagram;
  const allHighlights = slide.highlight_terms || [];
  const isActive = isNarrating || narrationProgress > 0;

  return (
    <div className="flex gap-6 h-full">
      {/* Left: bullets (60%) */}
      <div className="flex-[3] space-y-4 min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{slide.heading}</h2>
        {slide.subheading && <p className="text-sm text-muted-foreground">{slide.subheading}</p>}

        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-3">
            {slide.bullets.map((bullet, i) => {
              const state = getBulletState(i);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 transition-all duration-500",
                    state === "hidden" && "opacity-0 translate-x-[-8px]",
                    state === "active" && "opacity-100 translate-x-0",
                    state === "revealed" && "opacity-70 translate-x-0",
                    state === "visible" && "opacity-100 translate-x-0"
                  )}
                >
                  <span className={cn(
                    "mt-1.5 h-2 w-2 rounded-full shrink-0 transition-all duration-500",
                    state === "active" ? "bg-primary scale-150 ring-4 ring-primary/20" : "bg-primary/50"
                  )} />
                  <span className={cn(
                    "text-sm md:text-base leading-relaxed",
                    state === "active" ? "text-foreground font-medium" : "text-foreground/80"
                  )}>
                    {renderBulletContent(bullet, i, state)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right: diagram (40%) */}
      {diagram && (
        <div className={cn(
          "flex-[2] flex flex-col items-center justify-center p-4 rounded-lg border border-border/50 bg-muted/20 transition-all duration-500",
          isActive ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>
          <p className="text-xs font-semibold text-muted-foreground mb-3 text-center">{diagram.title}</p>
          <DiagramRenderer diagram={diagram} isActive={isActive} />
        </div>
      )}
    </div>
  );
}
