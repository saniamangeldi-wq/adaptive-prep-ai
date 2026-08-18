import { useMemo, useRef, useState } from "react";
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
  Area,
  AreaChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Table2, Download } from "lucide-react";

export type ChartWidgetData = {
  widget_type: "chart_visual";
  chart_type: "bar" | "line" | "pie" | "area" | "table";
  title?: string;
  subtitle?: string;
  x_label?: string;
  y_label?: string;
  unit?: string;
  categories?: string[];
  series?: Array<{ name: string; values: number[] }>;
  data?: Array<Record<string, string | number>>;
  source_note?: string;
  task_prompt?: string;
};

const PALETTE = [
  "hsl(var(--primary))",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#14B8A6",
];

function buildRows(data: ChartWidgetData) {
  if (Array.isArray(data.data) && data.data.length > 0) return data.data;
  const cats = data.categories ?? [];
  const series = data.series ?? [];
  return cats.map((c, i) => {
    const row: Record<string, string | number> = { name: c };
    series.forEach((s) => {
      row[s.name] = Number(s.values?.[i] ?? 0);
    });
    return row;
  });
}

export function ChartWidget({ data }: { data: ChartWidgetData }) {
  const [view, setView] = useState<"chart" | "table">(
    data.chart_type === "table" ? "table" : "chart",
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildRows(data), [data]);
  const keys = useMemo(() => {
    if (data.series?.length) return data.series.map((s) => s.name);
    const first = rows[0] ?? {};
    return Object.keys(first).filter((k) => k !== "name" && typeof first[k] === "number");
  }, [data, rows]);

  const nameKey = rows[0] && "name" in rows[0] ? "name" : Object.keys(rows[0] ?? { name: "" })[0];

  const downloadCsv = () => {
    const header = [nameKey, ...keys].join(",");
    const body = rows
      .map((r) => [r[nameKey], ...keys.map((k) => r[k] ?? "")].join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.title || "chart").replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 12 };
  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    fontSize: 12,
  };

  const renderChart = () => {
    switch (data.chart_type) {
      case "pie": {
        const key = keys[0];
        return (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie
              data={rows}
              dataKey={key}
              nameKey={nameKey}
              outerRadius="75%"
              label={(e: any) => `${e.name}: ${e.value}${data.unit ?? ""}`}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      }
      case "line":
        return (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.25} />
            ))}
          </AreaChart>
        );
      default:
        return (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <Card className="my-3 overflow-hidden border-border bg-card/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {data.title && <h4 className="truncate text-sm font-semibold text-foreground">{data.title}</h4>}
          {data.subtitle && <p className="text-xs text-muted-foreground">{data.subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {data.chart_type !== "table" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setView(view === "chart" ? "table" : "chart")}
            >
              {view === "chart" ? <Table2 className="mr-1 h-3.5 w-3.5" /> : <BarChart3 className="mr-1 h-3.5 w-3.5" />}
              {view === "chart" ? "Data" : "Chart"}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={downloadCsv}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div ref={wrapRef}>
        {view === "chart" && data.chart_type !== "table" ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-medium text-foreground">
                    {data.x_label || nameKey}
                  </th>
                  {keys.map((k) => (
                    <th key={k} className="border border-border px-3 py-2 text-left font-medium text-foreground">
                      {k}
                      {data.unit ? ` (${data.unit})` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="odd:bg-background/40">
                    <td className="border border-border px-3 py-2 text-muted-foreground">{String(r[nameKey])}</td>
                    {keys.map((k) => (
                      <td key={k} className="border border-border px-3 py-2 text-foreground">
                        {String(r[k] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(data.x_label || data.y_label) && view === "chart" && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {data.x_label}
          {data.x_label && data.y_label ? " · " : ""}
          {data.y_label}
          {data.unit ? ` (${data.unit})` : ""}
        </p>
      )}
      {data.source_note && <p className="mt-2 text-[11px] italic text-muted-foreground">{data.source_note}</p>}
      {data.task_prompt && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
          <span className="font-semibold text-primary">IELTS Task 1: </span>
          {data.task_prompt}
        </div>
      )}
    </Card>
  );
}
