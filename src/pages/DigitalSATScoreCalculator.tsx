import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Approximated Digital SAT raw-to-scaled conversion (per section).
// Based on publicly published College Board Digital SAT scoring guidelines.
// Math: 44 operational questions (2 modules × 22). R&W: 54 operational (2 × 27).
const MATH_TABLE: Record<number, number> = {
  0: 200, 1: 210, 2: 220, 3: 230, 4: 240, 5: 260, 6: 280, 7: 300, 8: 320,
  9: 340, 10: 360, 11: 380, 12: 400, 13: 410, 14: 420, 15: 440, 16: 460,
  17: 480, 18: 500, 19: 510, 20: 520, 21: 540, 22: 560, 23: 570, 24: 580,
  25: 600, 26: 610, 27: 620, 28: 640, 29: 650, 30: 660, 31: 680, 32: 690,
  33: 700, 34: 710, 35: 720, 36: 730, 37: 740, 38: 750, 39: 760, 40: 770,
  41: 780, 42: 790, 43: 800, 44: 800,
};

const RW_TABLE: Record<number, number> = {
  0: 200, 1: 200, 2: 210, 3: 220, 4: 230, 5: 240, 6: 260, 7: 280, 8: 300,
  9: 320, 10: 340, 11: 360, 12: 370, 13: 380, 14: 400, 15: 410, 16: 420,
  17: 430, 18: 440, 19: 450, 20: 460, 21: 470, 22: 480, 23: 490, 24: 500,
  25: 510, 26: 520, 27: 530, 28: 540, 29: 550, 30: 560, 31: 570, 32: 580,
  33: 590, 34: 600, 35: 610, 36: 620, 37: 630, 38: 650, 39: 660, 40: 670,
  41: 680, 42: 690, 43: 700, 44: 710, 45: 720, 46: 730, 47: 740, 48: 750,
  49: 760, 50: 770, 51: 780, 52: 790, 53: 800, 54: 800,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DigitalSATScoreCalculator() {
  const [math, setMath] = useState<string>("");
  const [rw, setRw] = useState<string>("");

  const result = useMemo(() => {
    const m = clamp(parseInt(math || "0", 10) || 0, 0, 44);
    const r = clamp(parseInt(rw || "0", 10) || 0, 0, 54);
    const mathScore = MATH_TABLE[m] ?? 200;
    const rwScore = RW_TABLE[r] ?? 200;
    return { mathScore, rwScore, total: mathScore + rwScore };
  }, [math, rw]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Digital SAT Score Calculator | AdaptivePrep</title>
        <meta
          name="description"
          content="Free Digital SAT score calculator. Convert your raw scores for Math and Reading & Writing into estimated scaled SAT scores (400–1600)."
        />
        <link rel="canonical" href="/digital-sat-score-calculator" />
      </Helmet>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-3">Digital SAT Score Calculator</h1>
        <p className="text-muted-foreground mb-8">
          Enter the number of questions you answered correctly in each section to estimate your scaled
          Digital SAT score. Each section is scored 200–800 for a total of 400–1600.
        </p>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Your raw scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rw">Reading &amp; Writing correct (0–54)</Label>
                <Input
                  id="rw"
                  type="number"
                  min={0}
                  max={54}
                  value={rw}
                  onChange={(e) => setRw(e.target.value)}
                  placeholder="e.g. 40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="math">Math correct (0–44)</Label>
                <Input
                  id="math"
                  type="number"
                  min={0}
                  max={44}
                  value={math}
                  onChange={(e) => setMath(e.target.value)}
                  placeholder="e.g. 35"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Reading &amp; Writing</div>
                <div className="text-3xl font-bold mt-1">{result.rwScore}</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Math</div>
                <div className="text-3xl font-bold mt-1">{result.mathScore}</div>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-3xl font-bold mt-1 text-primary">{result.total}</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Estimates only. The official Digital SAT uses adaptive modules, so actual scores
              depend on which second module you receive.
            </p>
          </CardContent>
        </Card>

        <section className="mt-10 text-center">
          <h2 className="text-2xl font-semibold mb-3">Ready to raise your score?</h2>
          <p className="text-muted-foreground mb-5">
            Get an adaptive study plan, AI tutoring, and full-length Digital SAT practice.
          </p>
          <Button asChild size="lg">
            <Link to="/signup">Start free with AdaptivePrep</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
