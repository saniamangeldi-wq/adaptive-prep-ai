import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DataVisual, MapFeatureType, MapVisual, ProcessVisual, TaskVisual } from "@ielts/contract.ts";
import { describeDataVisual, describeMapPanel } from "@/lib/ielts/visualText";
import { layoutMapLabels, type PlacedLabel } from "@/lib/ielts/mapLayout";
import { MAP_FEATURE_LABELS } from "@/lib/ielts/labels";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PALETTE = ["hsl(var(--primary))", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#14B8A6"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
};
const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 12 };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

function VisualTitle({ title, unit }: { title: string; unit?: string }) {
  return (
    <p className="text-sm font-semibold text-foreground">
      {title}
      {unit && !title.includes(`(${unit})`) && !title.includes(`${unit}`) ? <span className="font-normal text-muted-foreground"> ({unit})</span> : null}
    </p>
  );
}

function Unavailable() {
  return <p className="text-sm text-muted-foreground">This visual could not be displayed.</p>;
}

/** Screen-reader-only table with the real numbers. */
function DataTable({ v, visible }: { v: DataVisual; visible: boolean }) {
  const rows = Array.isArray(v.data) ? v.data : [];
  const series = Array.isArray(v.series) ? v.series : [];
  return (
    <div className={visible ? "overflow-x-auto rounded-lg border border-border" : "sr-only"}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{v.categoryKey ? v.categoryKey.charAt(0).toUpperCase() + v.categoryKey.slice(1) : ""}</TableHead>
            {series.map((s) => (
              <TableHead key={s} className="whitespace-nowrap text-right">{s}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{String(row?.[v.categoryKey] ?? "")}</TableCell>
              {series.map((s) => (
                <TableCell key={s} className="text-right tabular-nums">{String(row?.[s] ?? "")}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataVisualView({ visual }: { visual: DataVisual }) {
  const rows = (Array.isArray(visual.data) ? visual.data : []).filter(isObj) as Array<Record<string, string | number>>;
  const series = Array.isArray(visual.series) ? visual.series : [];
  if (rows.length === 0 || series.length === 0 || !visual.categoryKey) return <Unavailable />;

  // Numeric copy of the rows for drawing; the table above keeps the original text.
  const numeric = rows.map((r) => {
    const out: Record<string, string | number> = { [visual.categoryKey]: String(r[visual.categoryKey] ?? "") };
    for (const s of series) out[s] = Number(r[s]);
    return out;
  });

  if (visual.kind === "table") {
    return (
      <figure className="space-y-2">
        <VisualTitle title={visual.title} unit={visual.unit} />
        <DataTable v={visual} visible />
      </figure>
    );
  }

  const alt = describeDataVisual(visual);

  return (
    <figure className="space-y-2">
      <VisualTitle title={visual.title} unit={visual.unit} />
      <div role="img" aria-label={alt} className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {visual.kind === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}${visual.unit === "%" ? "%" : visual.unit ? ` ${visual.unit}` : ""}`} />
              <Pie data={numeric} dataKey={series[0]} nameKey={visual.categoryKey} outerRadius="85%" label={false} isAnimationActive={false}>
                {numeric.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="hsl(var(--background))" />
                ))}
              </Pie>
            </PieChart>
          ) : visual.kind === "line" ? (
            <LineChart data={numeric} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={visual.categoryKey} {...axis} interval="preserveStartEnd" />
              <YAxis {...axis} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s, i) => (
                <Line key={s} type="linear" dataKey={s} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot isAnimationActive={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={numeric} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={visual.categoryKey} {...axis} interval={0} />
              <YAxis {...axis} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {visual.kind === "pie" && (
        <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-hidden="true">
          {numeric.map((r, i) => (
            <li key={i} className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate text-foreground">{String(r[visual.categoryKey])}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {Number.isFinite(r[series[0]] as number) ? `${r[series[0]]}${visual.unit === "%" ? "%" : ""}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <DataTable v={visual} visible={false} />
    </figure>
  );
}

export function ProcessVisualView({ visual }: { visual: ProcessVisual }) {
  const steps = Array.isArray(visual.steps) ? visual.steps.filter(isObj) : [];
  if (steps.length === 0) return <Unavailable />;
  const links = Array.isArray(visual.links) ? visual.links.filter(isObj) : [];
  const numberOf = new Map(steps.map((s, i) => [s.id, i + 1]));
  const hasLinks = links.length > 0;

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <VisualTitle title={visual.title} />
        {visual.cyclic && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
            <RefreshCw className="h-3 w-3" aria-hidden="true" /> Cycle: the last step leads back to step 1
          </span>
        )}
      </div>

      <ol className="flex flex-col sm:flex-row sm:flex-wrap sm:items-stretch gap-2 list-none p-0 m-0">
        {steps.map((s, i) => (
          <Fragment key={s.id}>
            <li className="rounded-lg border border-border bg-muted/30 p-3 sm:min-w-[9rem] sm:max-w-[13rem] sm:flex-1">
              <span className="text-xs font-semibold text-primary">Step {i + 1}</span>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              {s.detail && <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>}
            </li>
            {!hasLinks && i < steps.length - 1 && (
              <li aria-hidden="true" className="flex items-center justify-center text-muted-foreground self-center">
                <ArrowDown className="h-4 w-4 sm:hidden" />
                <ArrowRight className="h-4 w-4 hidden sm:block" />
              </li>
            )}
          </Fragment>
        ))}
        {!hasLinks && visual.cyclic && (
          <li aria-hidden="true" className="flex items-center text-muted-foreground self-center" title="Back to step 1">
            <RefreshCw className="h-4 w-4" />
          </li>
        )}
      </ol>

      {hasLinks && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">How the steps connect</p>
          <ul className="space-y-0.5 text-sm text-foreground">
            {links.map((l, i) => (
              <li key={i}>
                Step {numberOf.get(l.from as string) ?? "?"} <span aria-hidden="true">→</span>
                <span className="sr-only"> leads to </span> step {numberOf.get(l.to as string) ?? "?"}
                {typeof l.label === "string" && l.label ? <span className="text-muted-foreground"> ({l.label})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}

const FEATURE_STYLE: Record<MapFeatureType, { fill: string; stroke: string }> = {
  building: { fill: "#64748b", stroke: "#cbd5e1" },
  housing: { fill: "#b45309", stroke: "#fcd34d" },
  road: { fill: "#3f3f46", stroke: "#a1a1aa" },
  path: { fill: "#78716c", stroke: "#d6d3d1" },
  water: { fill: "#1d4ed8", stroke: "#93c5fd" },
  green: { fill: "#15803d", stroke: "#86efac" },
  farmland: { fill: "#4d7c0f", stroke: "#bef264" },
  parking: { fill: "#52525b", stroke: "#e4e4e7" },
  industry: { fill: "#7e22ce", stroke: "#d8b4fe" },
  other: { fill: "#0f766e", stroke: "#5eead4" },
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function MapPanel({ panel, widthPx }: { panel: MapVisual["panels"][number]; widthPx: number }) {
  const features = (Array.isArray(panel.features) ? panel.features : []).filter(isObj);
  const labels = layoutMapLabels(features, widthPx);
  const badges = labels
    .filter((l): l is Extract<PlacedLabel, { kind: "badge" }> => l.kind === "badge")
    .sort((a, b) => a.n - b.n)
    .filter((b, i, all) => i === 0 || all[i - 1].n !== b.n);
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{panel.label}</p>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={describeMapPanel(panel)}
        className="w-full h-auto rounded-lg border border-border bg-background"
      >
        {/* All shapes first, then every label on top, so no shape hides a label. */}
        {features.map((f) => {
          const style = FEATURE_STYLE[f.type] ?? FEATURE_STYLE.other;
          const x = clamp(Number(f.x) || 0, 0, 100);
          const y = clamp(Number(f.y) || 0, 0, 100);
          const w = clamp(Number(f.w) || 0, 0, 100 - x);
          const h = clamp(Number(f.h) || 0, 0, 100 - y);
          return <rect key={f.id} x={x} y={y} width={w} height={h} fill={style.fill} fillOpacity={0.75} stroke={style.stroke} strokeWidth={0.5} rx={0.8} />;
        })}
        {labels.map((l) =>
          l.kind === "text" ? (
            <text
              key={l.id}
              x={l.x}
              y={l.y - ((l.lines.length - 1) * l.fontSize * 1.15) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={l.fontSize}
              fontWeight={600}
              fill="#ffffff"
              stroke="rgba(0,0,0,0.75)"
              strokeWidth={0.9}
              paintOrder="stroke"
            >
              {l.lines.map((line, i) => (
                <tspan key={i} x={l.x} dy={i === 0 ? 0 : l.fontSize * 1.15}>{line}</tspan>
              ))}
            </text>
          ) : (
            <g key={l.id}>
              <circle cx={l.x} cy={l.y} r={2.4} fill="rgba(0,0,0,0.8)" stroke="#ffffff" strokeWidth={0.4} />
              <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fontSize={3} fontWeight={700} fill="#ffffff">{l.n}</text>
            </g>
          )
        )}
      </svg>
      {badges.length > 0 && (
        <ol className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground list-none p-0" aria-hidden="true">
          {badges.map((b) => (
            <li key={b.id} className="flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/80 border border-white text-[10px] font-bold text-white">{b.n}</span>
              {b.label}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function MapVisualView({ visual }: { visual: MapVisual }) {
  const panels = (Array.isArray(visual.panels) ? visual.panels : []).filter(isObj);
  // Panels sit side by side only when there is room for readable labels; otherwise they stack.
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [panels.length]);
  const sideBySide = panels.length > 1 && width >= 560;
  if (panels.length === 0) return <Unavailable />;
  const types = Array.from(new Set(panels.flatMap((p) => (Array.isArray(p.features) ? p.features : []).filter(isObj).map((f) => f.type)))) as MapFeatureType[];
  return (
    <figure className="space-y-3">
      <VisualTitle title={visual.title} />
      <div ref={gridRef} className={`grid gap-3 ${sideBySide ? "grid-cols-2" : "grid-cols-1"}`}>
        {panels.map((p, i) => (
          <MapPanel key={i} panel={p} widthPx={sideBySide ? (width - 12) / 2 : width} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        {types.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border" style={{ background: (FEATURE_STYLE[t] ?? FEATURE_STYLE.other).fill, borderColor: (FEATURE_STYLE[t] ?? FEATURE_STYLE.other).stroke }} />
            {MAP_FEATURE_LABELS[t] ?? "Other"}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function TaskVisualView({ visual }: { visual: TaskVisual }) {
  if (!isObj(visual)) return <Unavailable />;
  switch (visual.kind) {
    case "line":
    case "bar":
    case "pie":
    case "table":
      return <DataVisualView visual={visual} />;
    case "process":
      return <ProcessVisualView visual={visual} />;
    case "map":
      return <MapVisualView visual={visual} />;
    default:
      return <Unavailable />;
  }
}

export function TaskVisuals({ visuals }: { visuals: TaskVisual[] }) {
  const list = Array.isArray(visuals) ? visuals : [];
  if (list.length === 0) return null;
  return (
    <div className="space-y-5">
      {list.map((v, i) => (
        <TaskVisualView key={i} visual={v} />
      ))}
    </div>
  );
}
