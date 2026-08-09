import { useEffect, useMemo, useState } from "react";
import { resolveFigureUrl } from "@/lib/figure-url";
import DOMPurify from "dompurify";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MathRenderer } from "@/components/MathRenderer";
import type { Question, QuestionTable } from "@/lib/test-generator";
import { logVisualHealthEvent } from "@/lib/visual-health";
import { themeSvg } from "@/lib/svg-theme";
import {
  buildVisualPlan,
  resolveVisualStatus,
  useAssetProbe,
  VISUAL_COPY,
  type VisualRenderStatus,
} from "@/lib/visual-status";

/**
 * SVG sanitizer backed by DOMPurify. Strips scripts, event handlers, and
 * javascript: URLs while preserving safe SVG markup for question figures.
 */
export function sanitizeSvg(raw: string): string {
  if (!raw) return "";
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}

/** Bar chart for tables recovered from a flattened chart, using recharts. */
export function DataChart({ table }: { table: QuestionTable }) {
  const series = table.headers.slice(1);
  const data = table.rows.map((row) => {
    const point: Record<string, string | number> = { name: row[0] };
    series.forEach((key, i) => {
      const value = Number(String(row[i + 1] ?? "").replace(/[%,]/g, ""));
      if (Number.isFinite(value)) point[key] = value;
    });
    return point;
  });
  if (data.length === 0) return null;

  return (
    <div className="my-4 h-64 w-full" data-testid="question-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend />
          {series.map((key, i) => (
            <Bar key={key} dataKey={key} fill={`hsl(var(--chart-${(i % 5) + 1}, var(--primary)))`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DataTable({ table, caption }: { table: QuestionTable; caption?: string }) {
  return (
    <figure className="my-4 flex flex-col items-center overflow-x-auto">
      {table.chart === "bar" && <DataChart table={table} />}
      <table className="min-w-[240px] max-w-full border-separate border-spacing-0 rounded-lg overflow-hidden border border-border bg-card text-sm shadow-sm">
        <thead className="bg-muted">
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="border-b border-border px-4 py-3 text-center font-semibold text-foreground tracking-wide">
                <MathRenderer text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-border px-4 py-3 text-center text-foreground tabular-nums">
                  <MathRenderer text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(table.caption || caption) && (
        <figcaption className="mt-2 text-xs text-muted-foreground text-center">{table.caption || caption}</figcaption>
      )}
    </figure>
  );
}

/** Health badge. Deliberately silent about "OK" while the probe is running. */
export function VisualHealthBadge({ status }: { status: VisualRenderStatus }) {
  if (status === "not_required") return null;

  const config = {
    checking: { icon: Loader2, label: VISUAL_COPY.checking, className: "text-muted-foreground", spin: true },
    ok: { icon: CheckCircle2, label: "Visual OK", className: "text-primary", spin: false },
    degraded_re_render: { icon: Info, label: "Accessible equivalent", className: "text-amber-500", spin: false },
    degraded_text_fallback: { icon: Info, label: "Text equivalent", className: "text-amber-500", spin: false },
    broken_quarantined: { icon: AlertTriangle, label: "Visual unavailable", className: "text-destructive", spin: false },
  }[status];

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${config.className}`} data-testid="visual-health-badge">
      <Icon className={`h-3.5 w-3.5 ${config.spin ? "animate-spin" : ""}`} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  );
}

interface VisualRendererProps {
  question: Question;
  /** Notifies the caller when a required visual has no usable representation. */
  onBlocked?: (blocked: boolean) => void;
}

/**
 * Renders a question visual through a verified fallback chain:
 * primary asset -> structured re-render -> text equivalent -> blocked.
 * A non-empty media URL is never treated as proof that the asset is healthy.
 */
export function VisualRenderer({ question, onBlocked }: VisualRendererProps) {
  const basePlan = useMemo(() => buildVisualPlan(question), [question]);

  // Durable assets live in a private bucket: resolve `figure_id` into a
  // short-lived signed URL before the asset probe can run.
  const needsSigning = Boolean(question.figure_id) && !basePlan.svg && !basePlan.imageSrc;
  const [signedSrc, setSignedSrc] = useState<string | undefined>(undefined);
  const [signing, setSigning] = useState(needsSigning);

  useEffect(() => {
    if (!needsSigning) {
      setSigning(false);
      setSignedSrc(undefined);
      return;
    }
    let cancelled = false;
    setSigning(true);
    resolveFigureUrl(question.figure_id!).then((url) => {
      if (cancelled) return;
      setSignedSrc(url ?? undefined);
      setSigning(false);
    });
    return () => {
      cancelled = true;
    };
  }, [question.figure_id, needsSigning]);

  const plan = useMemo(() => {
    const withAsset = signedSrc && !basePlan.imageSrc ? { ...basePlan, imageSrc: signedSrc } : basePlan;
    // An SVG that sanitizes to nothing renders nothing: drop it so the status
    // never reports "Visual OK" over an empty area.
    if (withAsset.svg && !themeSvg(sanitizeSvg(withAsset.svg)).includes("<svg")) {
      return { ...withAsset, svg: undefined };
    }
    return withAsset;
  }, [basePlan, signedSrc]);
  const probe = useAssetProbe(plan.imageSrc);
  const assetOk = probe === "checking" ? null : probe === "loaded";
  const status: VisualRenderStatus = signing ? "checking" : resolveVisualStatus(plan, assetOk);
  const safeSvg = useMemo(() => (plan.svg ? themeSvg(sanitizeSvg(plan.svg)) : ""), [plan.svg]);

  // When the table IS the primary visual (no image/SVG asset), status resolves
  // to "ok" — it must still be rendered, otherwise the badge reports "Visual OK"
  // over an empty visual area.
  const tableIsPrimary = status === "ok" && !plan.svg && !plan.imageSrc && Boolean(plan.table);
  const blocked = status === "broken_quarantined";
  useEffect(() => {
    onBlocked?.(blocked);
  }, [blocked, onBlocked]);

  // Report once per question + terminal status. `logVisualHealthEvent` also
  // de-duplicates, so re-renders never produce a second report.
  useEffect(() => {
    if (status === "checking" || status === "not_required" || status === "ok") return;
    logVisualHealthEvent(
      question,
      status === "broken_quarantined" ? "delivery_blocked" : "fallback_rendered",
      plan.imageSrc ? "unreachable" : "missing"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, status]);

  if (status === "not_required") return null;

  if (status === "checking") {
    return (
      <div role="status" className="my-4 flex min-h-28 items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {VISUAL_COPY.checking}
      </div>
    );
  }

  if (blocked) {
    return (
      <div role="alert" className="my-4 rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{VISUAL_COPY.broken}</p>
        <div className="mt-3 flex justify-center">
          <VisualHealthBadge status={status} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {status === "ok" && plan.svg ? (
        <figure className="my-4 flex flex-col items-center">
          <div className="flex justify-center p-5 rounded-xl bg-card border border-border shadow-sm">
            <div
              role="img"
              aria-label={plan.alt}
              className="max-w-full text-foreground [&>svg]:max-h-[420px] [&>svg]:w-auto [&_text]:fill-current [&_text]:![font-family:inherit]"
              dangerouslySetInnerHTML={{ __html: safeSvg }}
            />
          </div>
          {plan.caption && <figcaption className="mt-2 text-xs text-muted-foreground text-center">{plan.caption}</figcaption>}
        </figure>
      ) : status === "ok" && plan.imageSrc ? (
        <figure className="my-4 flex flex-col items-center">
          <div className="flex justify-center p-5 rounded-xl bg-[hsl(var(--figure-paper))] border border-border shadow-sm">
            <img src={plan.imageSrc} alt={plan.alt || "Question figure"} className="max-w-full max-h-[420px] object-contain" />
          </div>
          {plan.caption && <figcaption className="mt-2 text-xs text-muted-foreground text-center">{plan.caption}</figcaption>}
        </figure>
      ) : null}

      {tableIsPrimary && plan.table && <DataTable table={plan.table} caption={plan.caption} />}

      {status === "degraded_re_render" && plan.table && (
        <>
          <p role="status" className="text-xs text-muted-foreground">{VISUAL_COPY.structuredFallback}</p>
          <DataTable table={plan.table} caption={plan.caption} />
        </>
      )}

      {status === "degraded_text_fallback" && plan.textEquivalent && (
        <>
          <p role="status" className="text-xs text-muted-foreground">{VISUAL_COPY.structuredFallback}</p>
          <div className="my-4 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
            {plan.textEquivalent}
          </div>
        </>
      )}

      <div className="flex justify-end">
        <VisualHealthBadge status={status} />
      </div>
    </div>
  );
}

export default VisualRenderer;
