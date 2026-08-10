import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Desmos graphing calculator panel, as offered on the Digital SAT math sections.
 * Loads the official Desmos API script once and falls back to the embedded
 * desmos.com iframe if the script cannot be loaded.
 */
const DESMOS_SRC =
  "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

let scriptPromise: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).Desmos) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DESMOS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Desmos"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface DesmosCalculatorProps {
  onClose: () => void;
}

export function DesmosCalculator({ onClose }: DesmosCalculatorProps) {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const calcRef = useRef<{ destroy: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (cancelled || !graphRef.current) return;
        const Desmos = (window as any).Desmos;
        calcRef.current = Desmos.GraphingCalculator(graphRef.current, {
          expressions: true,
          settingsMenu: false,
          zoomButtons: true,
          border: false,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
    },
    [pos]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPos({ x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      data-testid="desmos-calculator"
      className="fixed bottom-4 right-4 z-50 w-[min(28rem,calc(100vw-2rem))] h-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      <div
        className="flex cursor-move items-center justify-between border-b border-border bg-muted px-3 py-2 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Desmos Calculator
        </span>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close calculator">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {failed ? (
        <iframe
          src="https://www.desmos.com/calculator"
          className="h-[calc(100%-41px)] w-full"
          title="Desmos Calculator"
        />
      ) : (
        <div ref={graphRef} className="h-[calc(100%-41px)] w-full" />
      )}
    </div>
  );
}

export default DesmosCalculator;
