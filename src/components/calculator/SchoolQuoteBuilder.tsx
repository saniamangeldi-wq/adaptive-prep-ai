import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Copy, RotateCcw, Check, GraduationCap, Building2, Users, Settings2, Receipt, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ============== CONSTANTS (ported from HTML) ==============
const TIERS = {
  starter:    { name: "School Starter", price: 199, students: 25, teachers: 3,   unlimited: false },
  pro:        { name: "School Pro",     price: 349, students: 75, teachers: 8,   unlimited: false },
  enterprise: { name: "Enterprise",     price: 599, students: 75, teachers: 999, unlimited: true  },
} as const;

type TierKey = keyof typeof TIERS;

const TOPIC_PRICE = 15;
const TOPIC_CATEGORIES: Record<string, string[]> = {
  "AP Subjects": ["AP Calculus AB","AP Calculus BC","AP Statistics","AP Physics 1","AP Physics 2","AP Chemistry","AP Biology","AP Psychology","AP English Lang","AP English Lit","AP US History","AP World History","AP Computer Science A","AP Economics","AP Gov & Politics"],
  "IELTS":       ["IELTS Academic","IELTS General Training","IELTS Reading","IELTS Writing","IELTS Listening","IELTS Speaking"],
  "SAT / Test Prep": ["SAT Math","SAT Reading & Writing","SAT Full Practice","TOEFL iBT"],
};

interface Addon {
  id: string; name: string; desc: string; price: number; type: "toggle" | "qty";
}
const ADDONS: Addon[] = [
  { id: "parent_portal",   name: "Parent Portal",        desc: "Parents track progress",                  price: 20,  type: "toggle" },
  { id: "custom_tests",    name: "Custom Test Bank",     desc: "School-branded test sets",                price: 30,  type: "toggle" },
  { id: "api_lms",         name: "LMS / API Integration",desc: "Google Classroom, Moodle, etc.",          price: 50,  type: "toggle" },
  { id: "extra_teachers",  name: "Extra Teacher Seats",  desc: "Beyond plan limit ($12/teacher)",         price: 12,  type: "qty"    },
  { id: "extra_students",  name: "Extra Students",       desc: "Beyond base quota ($3/student)",          price: 3,   type: "qty"    },
  { id: "onboarding",      name: "On-site Onboarding",   desc: "1-day setup & training",                  price: 150, type: "toggle" },
];

const PERIODS = {
  monthly:   { label: "Monthly",  months: 1,  discount: 0    },
  quarterly: { label: "3 Months", months: 3,  discount: 0.05 },
  biannual:  { label: "6 Months", months: 6,  discount: 0.08 },
  annual:    { label: "1 Year",   months: 12, discount: 0.15 },
  custom:    { label: "Custom",   months: 1,  discount: 0    },
} as const;
type PeriodKey = keyof typeof PERIODS;

// KZ 2026 tax regimes:
//  • Simplified (СНР) — 4% on gross revenue, NOT a VAT payer (turnover < ~₸124M/yr threshold ≈ $236k)
//  • General — 20% CIT on profit + 16% VAT on top of price (registered VAT payer)
// Stripe international card fee (KZ): 3.9% + $0.30/charge
const STRIPE_PCT = 0.039;
const STRIPE_FIXED = 0.30;
type TaxRegime = "simplified" | "general";
const VAT_RATE = 0.16;
const SIMPLIFIED_RATE = 0.04;
const CIT_RATE = 0.20;

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKzt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " ₸";

// ============== COMPONENT ==============
export default function SchoolQuoteBuilder() {
  const [tier, setTier] = useState<TierKey>("pro");
  const [students, setStudents] = useState(75);
  const [teachers, setTeachers] = useState(8);
  const [basePrice, setBasePrice] = useState(349);
  const [kztRate, setKztRate] = useState(525);

  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const [customMonths, setCustomMonths] = useState(18);
  const [customDiscount, setCustomDiscount] = useState(20);

  const [upfrontEnabled, setUpfrontEnabled] = useState(false);
  const [upfrontMode, setUpfrontMode] = useState<"auto" | "custom">("auto");
  const [upfrontLabel, setUpfrontLabel] = useState("");
  const [upfrontCustomAmount, setUpfrontCustomAmount] = useState(0);

  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState("");

  const [toggleAddons, setToggleAddons] = useState<Record<string, boolean>>({});
  const [qtyAddons, setQtyAddons] = useState<Record<string, number>>({});

  // Tax & cost model — regime is AUTO by default (based on projected annual turnover)
  const [taxAuto, setTaxAuto] = useState(true);
  const [taxRegimeManual, setTaxRegimeManual] = useState<TaxRegime>("simplified");
  const [estSchoolCount, setEstSchoolCount] = useState(1); // how many schools at this price (for auto threshold)
  const [aiCostPerStudent, setAiCostPerStudent] = useState(0.75); // USD/mo realistic
  const [fixedOverhead, setFixedOverhead] = useState(53);          // USD/mo allocated per school
  const [includeStripe, setIncludeStripe] = useState(true);

  // Update headcount + base when tier changes
  useEffect(() => {
    const t = TIERS[tier];
    setStudents(t.students);
    setTeachers(t.teachers);
    setBasePrice(t.price);
  }, [tier]);

  const periodInfo = useMemo(() => {
    if (period !== "custom") return PERIODS[period];
    const m = Math.max(1, customMonths || 1);
    const d = Math.min(100, Math.max(0, customDiscount)) / 100;
    const yrs = m >= 12 ? `${(m / 12).toFixed(1).replace(/\.0$/, "")} yr` : `${m} mo`;
    return { label: `Custom (${yrs})`, months: m, discount: d };
  }, [period, customMonths, customDiscount]);

  const calc = useMemo(() => {
    const topicFee = selectedTopics.size * TOPIC_PRICE;
    let addonTotal = 0;
    ADDONS.forEach((a) => {
      if (a.type === "toggle" && toggleAddons[a.id]) addonTotal += a.price;
      else if (a.type === "qty") addonTotal += (qtyAddons[a.id] || 0) * a.price;
    });
    const hasExtras = topicFee > 0 || addonTotal > 0;

    const moBase = basePrice + topicFee + addonTotal;
    const discount = moBase * periodInfo.discount;
    const moNet = moBase - discount;            // net monthly price (excl. VAT) — what 1 school pays per month
    const periodNet = moNet * periodInfo.months;

    let upfrontAmt = 0;
    let upfrontLbl = "";
    let autoFirstMonth = 0;
    let autoSetupFee = 0;
    const useUpfront = upfrontEnabled && hasExtras;
    if (useUpfront) {
      if (upfrontMode === "auto") {
        autoFirstMonth = moNet;
        autoSetupFee = moNet * 0.10;
        upfrontAmt = autoFirstMonth + autoSetupFee;
        upfrontLbl = "1st Month + Setup 10%";
      } else {
        upfrontAmt = upfrontCustomAmount;
        upfrontLbl = upfrontLabel || "Upfront payment";
      }
    }

    const subtotal = periodNet + upfrontAmt; // net price the school agrees to (excl. VAT)

    // ===== AUTO TAX REGIME =====
    // KZ Simplified threshold ≈ ₸124M / yr → in USD ≈ 124_000_000 / kztRate
    // Project annual gross across all schools at this price (× estSchoolCount × 12 / period months for upfront-less recurring view)
    const annualNetPerSchool = moNet * 12;
    const projectedAnnualGross = annualNetPerSchool * Math.max(1, estSchoolCount);
    const thresholdUSD = 124_000_000 / Math.max(1, kztRate);
    const autoRegime: TaxRegime = projectedAnnualGross < thresholdUSD ? "simplified" : "general";
    const taxRegime: TaxRegime = taxAuto ? autoRegime : taxRegimeManual;

    // KZ tax model
    const vat = taxRegime === "general" ? subtotal * VAT_RATE : 0;
    const invoice = subtotal + vat;
    const monthlySchoolPays = moNet * (taxRegime === "general" ? 1 + VAT_RATE : 1);

    // Cost-to-serve
    const aiCost = students * aiCostPerStudent;
    const supportBuf = moNet * 0.05;
    const costMo = fixedOverhead + aiCost + supportBuf;
    const cost = costMo * periodInfo.months;

    // Stripe processing on the gross invoice
    const stripeFee = includeStripe ? invoice * STRIPE_PCT + STRIPE_FIXED : 0;

    // Tax payable
    const simpTax = taxRegime === "simplified" ? subtotal * SIMPLIFIED_RATE : 0;
    const profitBeforeTax = subtotal - cost - stripeFee;
    const citTax = taxRegime === "general" ? Math.max(0, profitBeforeTax) * CIT_RATE : 0;
    const taxTotal = simpTax + citTax;

    const profit = profitBeforeTax - taxTotal;
    const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

    return {
      topicFee, addonTotal, hasExtras, moBase, discount, moNet, periodNet,
      upfrontAmt, upfrontLbl, useUpfront, autoFirstMonth, autoSetupFee,
      subtotal, vat, invoice, monthlySchoolPays, simpTax, citTax, taxTotal, stripeFee,
      cost, profit, margin,
      taxRegime, autoRegime, projectedAnnualGross, thresholdUSD,
    };
  }, [basePrice, selectedTopics, toggleAddons, qtyAddons, periodInfo, upfrontEnabled, upfrontMode, upfrontCustomAmount, upfrontLabel, students, taxAuto, taxRegimeManual, estSchoolCount, kztRate, aiCostPerStudent, fixedOverhead, includeStripe]);

  const toggleTopic = (t: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const addCustomTopic = () => {
    const v = customTopicInput.trim();
    if (!v || customTopics.includes(v) || selectedTopics.has(v)) {
      setCustomTopicInput("");
      return;
    }
    setCustomTopics((prev) => [...prev, v]);
    setSelectedTopics((prev) => new Set(prev).add(v));
    setCustomTopicInput("");
  };

  const removeCustomTopic = (v: string) => {
    setCustomTopics((prev) => prev.filter((t) => t !== v));
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.delete(v);
      return next;
    });
  };

  const resetAll = () => {
    setSelectedTopics(new Set());
    setCustomTopics([]);
    setToggleAddons({});
    setQtyAddons({});
    setPeriod("monthly");
    setCustomMonths(18);
    setCustomDiscount(20);
    setUpfrontEnabled(false);
    setUpfrontMode("auto");
    setUpfrontCustomAmount(0);
    setUpfrontLabel("");
    setTier(tier); // re-trigger effect
  };

  const copyQuote = () => {
    const tierData = TIERS[tier];
    const topics = [...selectedTopics].join(", ") || "None";
    const teacherDisplay = tierData.unlimited ? "Unlimited" : String(teachers);
    const discLine = periodInfo.discount > 0 ? ` (${(periodInfo.discount * 100).toFixed(0)}% discount applied)` : "";
    const upfrontLine = calc.useUpfront && calc.upfrontAmt > 0 ? `\n${calc.upfrontLbl}: ${fmt(calc.upfrontAmt)}` : "";
    const text = [
      "AdaptivePrep — School Quote",
      "------------------------------------",
      `Plan: ${tierData.name}`,
      `Students: ${students} | Teachers: ${teacherDisplay}`,
      `Topics: ${topics}`,
      `Billing: ${periodInfo.label}${discLine}${upfrontLine}`,
      `Base Price: $${basePrice}/mo`,
      "",
      `School pays / month: ${fmt(calc.monthlySchoolPays)}${calc.taxRegime === "general" ? " (incl. 16% VAT)" : ""}`,
      `Invoice Total${calc.taxRegime === "general" ? " (incl. 16% VAT)" : ""}: ${fmt(calc.invoice)}`,
      `In KZT: ${fmtKzt(calc.invoice * kztRate)}`,
      `Est. Net Profit: ${fmt(calc.profit)} (${calc.margin.toFixed(1)}% margin)`,
      "------------------------------------",
      "Generated by AdaptivePrep Quote Builder",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "✓ Quote copied to clipboard" });
    });
  };

  const suffix = periodInfo.months === 1 ? "/mo" : ` / ${periodInfo.months} mo`;

  return (
    <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-4 items-start">
      {/* LEFT: INPUTS */}
      <div className="space-y-4">
        {/* Step 1: Tier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> School Plan <Badge variant="secondary" className="ml-auto text-[10px]">Step 1</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIERS) as TierKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTier(k)}
                  className={`text-left p-2.5 rounded-md border text-xs transition-all ${
                    tier === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted"
                  }`}
                >
                  <div className="font-semibold mb-0.5">{TIERS[k].name}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {TIERS[k].students} students · {TIERS[k].unlimited ? "Unlimited" : TIERS[k].teachers} teachers
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Headcount */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Headcount <Badge variant="secondary" className="ml-auto text-[10px]">Step 2</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Students</Label>
              <Input type="number" min={1} value={students} onChange={(e) => setStudents(parseInt(e.target.value) || 0)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                Teachers {TIERS[tier].unlimited && <Badge className="text-[9px] px-1.5 py-0">UNLIMITED</Badge>}
              </Label>
              <Input
                type="number"
                value={TIERS[tier].unlimited ? "" : teachers}
                placeholder={TIERS[tier].unlimited ? "Unlimited" : "Included"}
                disabled
                className="h-9 opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Base Monthly Price (USD)</Label>
              <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)} className="h-9" />
              <span className="text-[10.5px] text-muted-foreground/80">Edit if you negotiate a custom price</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">USD / KZT Rate</Label>
              <Input type="number" value={kztRate} onChange={(e) => setKztRate(parseFloat(e.target.value) || 525)} className="h-9" />
            </div>
          </CardContent>
        </Card>

        {/* Step 2b: Billing Period */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Billing Period <Badge variant="secondary" className="ml-auto text-[10px]">Step 2b</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {(Object.keys(PERIODS) as PeriodKey[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`p-1.5 rounded-md border text-[11px] transition-all ${
                    period === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted"
                  }`}
                >
                  <div className="font-semibold leading-tight">{PERIODS[p].label}</div>
                  <div className="text-[9.5px] text-emerald-500 leading-tight">
                    {PERIODS[p].discount > 0 ? `Save ${PERIODS[p].discount * 100}%` : p === "custom" ? "Set own" : "Standard"}
                  </div>
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Number of Months</Label>
                  <Input type="number" min={1} max={120} value={customMonths} onChange={(e) => setCustomMonths(parseInt(e.target.value) || 1)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custom Discount %</Label>
                  <Input type="number" min={0} max={100} value={customDiscount} onChange={(e) => setCustomDiscount(parseFloat(e.target.value) || 0)} className="h-9" />
                </div>
              </div>
            )}

            {/* Upfront */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Upfront Payment</div>
                  <div className="text-xs text-muted-foreground">One-time fee on top of subscription</div>
                </div>
                <Switch checked={upfrontEnabled} onCheckedChange={setUpfrontEnabled} />
              </div>

              {upfrontEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUpfrontMode("auto")}
                      className={`p-1.5 rounded-md border text-[11px] ${upfrontMode === "auto" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
                    >
                      <div className="font-semibold">Auto</div>
                      <div className="text-[9.5px] text-emerald-500">1st month + 10%</div>
                    </button>
                    <button
                      onClick={() => setUpfrontMode("custom")}
                      className={`p-1.5 rounded-md border text-[11px] ${upfrontMode === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
                    >
                      <div className="font-semibold">Custom</div>
                      <div className="text-[9.5px] text-muted-foreground">I choose</div>
                    </button>
                  </div>

                  {upfrontMode === "auto" ? (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-2">Auto upfront = first month net + 10% setup fee.</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-sm border bg-background p-2">
                          <div className="text-[10px] text-muted-foreground">1st month</div>
                          <div className="text-sm font-semibold text-primary">{fmt(calc.autoFirstMonth)}</div>
                        </div>
                        <div className="rounded-sm border bg-background p-2">
                          <div className="text-[10px] text-muted-foreground">Setup 10%</div>
                          <div className="text-sm font-semibold text-primary">{fmt(calc.autoSetupFee)}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Total upfront: <strong className="text-amber-500">{fmt(calc.autoFirstMonth + calc.autoSetupFee)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Label / Description</Label>
                        <Input value={upfrontLabel} onChange={(e) => setUpfrontLabel(e.target.value)} placeholder="e.g. Setup fee" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
                        <Input type="number" min={0} value={upfrontCustomAmount} onChange={(e) => setUpfrontCustomAmount(parseFloat(e.target.value) || 0)} className="h-9" />
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    {calc.useUpfront && calc.upfrontAmt > 0 ? (
                      <>Invoice includes <strong>{fmt(calc.upfrontAmt)}</strong> upfront = <strong className="text-amber-500">{fmtKzt(calc.upfrontAmt * kztRate)}</strong></>
                    ) : (
                      <>Upfront is only applied when topics or add-ons are selected.</>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Topics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" /> Topics Selected <Badge variant="secondary" className="ml-auto text-[10px]">Step 3</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Each topic adds ${TOPIC_PRICE}/mo content fee.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(TOPIC_CATEGORIES).map(([cat, topics]) => (
              <div key={cat} className="mb-3">
                <div className="text-[10.5px] uppercase tracking-wider font-bold text-primary mb-1.5 pb-1 border-b border-primary/20">{cat}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {topics.map((t) => {
                    const active = selectedTopics.has(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTopic(t)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[11.5px] text-left transition-all ${
                          active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-muted/30 hover:bg-muted"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${active ? "bg-primary border-primary" : "border-border"}`}>
                          {active && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom topics */}
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Add custom topic…"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTopic(); } }}
                className="h-9 text-xs"
              />
              <Button size="sm" onClick={addCustomTopic}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </div>
            {customTopics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
                {customTopics.map((v) => (
                  <div key={v} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-primary bg-primary/10 text-primary text-[11.5px]">
                    <Check className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate flex-1">{v}</span>
                    <button onClick={() => removeCustomTopic(v)} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground mt-3">
              {selectedTopics.size} topic{selectedTopics.size !== 1 ? "s" : ""} selected · +${selectedTopics.size * TOPIC_PRICE}/mo
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Add-ons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" /> Add-ons & Extras <Badge variant="secondary" className="ml-auto text-[10px]">Step 4</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ADDONS.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{a.type === "qty" ? `$${a.price}/ea` : `+$${a.price}/mo`}</span>
                  {a.type === "toggle" ? (
                    <Switch
                      checked={!!toggleAddons[a.id]}
                      onCheckedChange={(v) => setToggleAddons((p) => ({ ...p, [a.id]: v }))}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => setQtyAddons((p) => ({ ...p, [a.id]: Math.max(0, (p[a.id] || 0) - 1) }))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="min-w-5 text-center text-sm font-medium">{qtyAddons[a.id] || 0}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => setQtyAddons((p) => ({ ...p, [a.id]: (p[a.id] || 0) + 1 }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Step 5: Tax & Cost Model */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Tax & Cost Model <Badge variant="secondary" className="ml-auto text-[10px]">Step 5</Badge>
            </CardTitle>
            <CardDescription className="text-xs">KZ 2026 — switch regime based on your annual turnover.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTaxRegime("simplified")}
                className={`p-2 rounded-md border text-left text-[11px] transition-all ${
                  taxRegime === "simplified" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted"
                }`}
              >
                <div className="font-semibold">Simplified (СНР)</div>
                <div className="text-[10px] text-muted-foreground">4% on revenue · no VAT · &lt; ~₸124M/yr</div>
              </button>
              <button
                onClick={() => setTaxRegime("general")}
                className={`p-2 rounded-md border text-left text-[11px] transition-all ${
                  taxRegime === "general" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted"
                }`}
              >
                <div className="font-semibold">General regime</div>
                <div className="text-[10px] text-muted-foreground">VAT 16% + CIT 20% on profit</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">AI cost / student / mo (USD)</Label>
                <Input type="number" step="0.05" min={0} value={aiCostPerStudent}
                  onChange={(e) => setAiCostPerStudent(parseFloat(e.target.value) || 0)} className="h-9" />
                <span className="text-[10px] text-muted-foreground/80">Gemini + ElevenLabs blended</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fixed overhead / school / mo (USD)</Label>
                <Input type="number" min={0} value={fixedOverhead}
                  onChange={(e) => setFixedOverhead(parseFloat(e.target.value) || 0)} className="h-9" />
                <span className="text-[10px] text-muted-foreground/80">Hosting, support, tools allocation</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5">
              <div>
                <div className="text-sm font-medium">Include Stripe fees</div>
                <div className="text-[10.5px] text-muted-foreground">3.9% + $0.30 per charge (KZ international card)</div>
              </div>
              <Switch checked={includeStripe} onCheckedChange={setIncludeStripe} />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* RIGHT: RESULTS */}
      <div className="lg:sticky lg:top-4">
        <Card className="border-primary/30 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quote Summary</CardTitle>
              <span className="text-xs text-muted-foreground">{TIERS[tier].name}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary tracking-tight">{fmt(calc.invoice)}</div>
            <div className="text-sm text-muted-foreground">≈ {fmtKzt(calc.invoice * kztRate)} {suffix}</div>

            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold mt-4 mb-1">Breakdown</div>
            <Row label="Base plan price/mo" value={fmt(basePrice)} />
            <Row label="Billing period" value={periodInfo.label + (periodInfo.discount > 0 ? ` (-${(periodInfo.discount * 100).toFixed(0)}%)` : "")} />
            {periodInfo.discount > 0 && (
              <Row label="Period discount" value={"−" + fmt(calc.discount * periodInfo.months)} valueClass="text-emerald-500" />
            )}
            <Row label="Topics add-on" value={calc.topicFee > 0 ? fmt(calc.topicFee) : "$0"} />
            <Row label="Extra add-ons" value={calc.addonTotal > 0 ? fmt(calc.addonTotal) : "$0"} />
            {calc.useUpfront && calc.upfrontAmt > 0 && (
              <Row label={calc.upfrontLbl} value={fmt(calc.upfrontAmt)} />
            )}
            <Row
              label={periodInfo.months > 1 ? `Total (${periodInfo.months} mo net)` : "Subtotal (net)"}
              value={fmt(calc.subtotal)}
              valueClass="text-primary font-bold"
              bold
            />

            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold mt-3 mb-1">
              Kazakhstan Tax · {taxRegime === "simplified" ? "Simplified (СНР 4%)" : "General (VAT 16% + CIT 20%)"}
            </div>
            {taxRegime === "general" && (
              <Row label="VAT 16% (collected, pass-through)" value={"+" + fmt(calc.vat)} valueClass="text-amber-500" />
            )}
            <Row
              label={periodInfo.months > 1 ? `Invoice Total – ${periodInfo.label}` : "Invoice Total"}
              value={fmt(calc.invoice)}
              bold
            />
            <Row label="Invoice in KZT" value={fmtKzt(calc.invoice * kztRate)} valueClass="text-muted-foreground" />

            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold mt-3 mb-1">Your Profit</div>
            <Row label="Est. cost to serve" value={"−" + fmt(calc.cost)} valueClass="text-rose-500" />
            {calc.stripeFee > 0 && (
              <Row label="Stripe fee (3.9% + $0.30)" value={"−" + fmt(calc.stripeFee)} valueClass="text-rose-500" />
            )}
            {taxRegime === "simplified" ? (
              <Row label="Simplified tax 4% (on revenue)" value={"−" + fmt(calc.simpTax)} valueClass="text-amber-500" />
            ) : (
              <Row label="CIT 20% (on profit)" value={"−" + fmt(calc.citTax)} valueClass="text-amber-500" />
            )}
            <Row label="Net profit" value={fmt(calc.profit)} valueClass="text-emerald-500 font-semibold" />
            <Row label="Net margin" value={calc.margin.toFixed(1) + "%"} />

            <Separator className="my-4" />
            <div className="flex gap-2">
              <Button onClick={copyQuote} className="flex-1">
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy Quote
              </Button>
              <Button variant="outline" onClick={resetAll}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "", bold = false }: { label: string; value: string; valueClass?: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0 ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
