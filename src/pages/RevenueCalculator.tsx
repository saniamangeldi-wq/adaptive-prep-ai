import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PRICING_CONFIG, fmtKZT } from "@/lib/pricing-config";
import { Calculator, TrendingUp, Building2, GraduationCap, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessCalculator } from "@/lib/calculator-access";
import SchoolQuoteBuilder from "@/components/calculator/SchoolQuoteBuilder";

// KZ tax rates
const VAT_RATE = 0.12; // 12% NDS
const CIT_RATE = 0.20; // 20% Corporate Income Tax
const STRIPE_FEE_PCT = 0.029;
const STRIPE_FEE_FLAT_KZT = 150; // ~$0.30

// Custom school pricing (since config has null) — editable defaults
const SCHOOL_DEFAULT_PRICES_KZT = {
  starter: 75000,    // ~$150 / month
  pro: 200000,       // ~$400 / month
  enterprise: 500000,// ~$1000 / month
};

// Variable cost per active student per month (AI + ElevenLabs + infra)
const COST_PER_STUDENT_KZT = 400;
const COST_PER_TUTOR_STUDENT_KZT = 600; // tutor students use more AI

type Scenario = "low" | "base" | "high";

interface SchoolCounts { starter: number; pro: number; enterprise: number; }
interface TutorCounts { solo: number; pro: number; business: number; }

const SCENARIO_MULTIPLIERS: Record<Scenario, number> = {
  low: 0.5,
  base: 1,
  high: 2,
};

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="h-9"
      />
    </div>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₸</span>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-9 pl-7"
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, bold, accent, negative }: { label: string; value: string; bold?: boolean; accent?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${bold ? "font-semibold" : ""}`}>
      <span className={`text-sm ${accent ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${negative ? "text-destructive" : ""} ${accent ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function RevenueCalculator() {
  const { user } = useAuth();
  if (!canAccessCalculator(user?.id)) {
    return <Navigate to="/dashboard" replace />;
  }
  const [scenario, setScenario] = useState<Scenario>("base");

  // Schools
  const [schoolPrices, setSchoolPrices] = useState({ ...SCHOOL_DEFAULT_PRICES_KZT });
  const [schoolCounts, setSchoolCounts] = useState<SchoolCounts>({ starter: 5, pro: 3, enterprise: 1 });

  // Tutors
  const [tutorCounts, setTutorCounts] = useState<TutorCounts>({ solo: 20, pro: 8, business: 2 });

  // Costs
  const [costPerStudent, setCostPerStudent] = useState(COST_PER_STUDENT_KZT);
  const [costPerTutorStudent, setCostPerTutorStudent] = useState(COST_PER_TUTOR_STUDENT_KZT);
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState(150000); // infra, salaries placeholder

  const calc = useMemo(() => {
    const mult = SCENARIO_MULTIPLIERS[scenario];

    // School revenue
    const schoolGross =
      schoolPrices.starter * schoolCounts.starter * mult +
      schoolPrices.pro * schoolCounts.pro * mult +
      schoolPrices.enterprise * schoolCounts.enterprise * mult;

    const schoolStudents =
      25 * schoolCounts.starter * mult +
      75 * schoolCounts.pro * mult +
      150 * schoolCounts.enterprise * mult;

    // Tutor revenue
    const solo = PRICING_CONFIG.tutors[0].monthlyPriceKZT;
    const pro = PRICING_CONFIG.tutors[1].monthlyPriceKZT;
    const biz = PRICING_CONFIG.tutors[2].monthlyPriceKZT;

    const tutorGross =
      solo * tutorCounts.solo * mult +
      pro * tutorCounts.pro * mult +
      biz * tutorCounts.business * mult;

    const tutorStudents =
      5 * tutorCounts.solo * mult +
      15 * tutorCounts.pro * mult +
      40 * tutorCounts.business * mult;

    const grossRevenue = schoolGross + tutorGross;

    // Stripe fees (per transaction; assume 1 transaction per subscription/month)
    const totalSubs = schoolCounts.starter + schoolCounts.pro + schoolCounts.enterprise +
                      tutorCounts.solo + tutorCounts.pro + tutorCounts.business;
    const stripeFees = (grossRevenue * STRIPE_FEE_PCT) + (totalSubs * mult * STRIPE_FEE_FLAT_KZT);

    // Variable costs
    const variableCosts =
      schoolStudents * costPerStudent +
      tutorStudents * costPerTutorStudent;

    // VAT (12% — included in price, so it's extracted from gross)
    const vatOwed = grossRevenue - (grossRevenue / (1 + VAT_RATE));
    const netRevenueExVAT = grossRevenue - vatOwed;

    // Costs subtracted from net (ex-VAT) revenue
    const totalCosts = stripeFees + variableCosts + fixedMonthlyCosts;
    const profitBeforeTax = netRevenueExVAT - totalCosts;

    // Corporate Income Tax (20% on profit, only if positive)
    const cit = profitBeforeTax > 0 ? profitBeforeTax * CIT_RATE : 0;
    const netProfit = profitBeforeTax - cit;

    return {
      schoolGross, tutorGross, grossRevenue,
      schoolStudents, tutorStudents,
      vatOwed, netRevenueExVAT,
      stripeFees, variableCosts, fixedMonthlyCosts,
      totalCosts, profitBeforeTax, cit, netProfit,
      annual: netProfit * 12,
    };
  }, [scenario, schoolPrices, schoolCounts, tutorCounts, costPerStudent, costPerTutorStudent, fixedMonthlyCosts]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Revenue Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Portfolio projections + per-school quote builder
            </p>
          </div>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList>
            <TabsTrigger value="portfolio">Portfolio P&L</TabsTrigger>
            <TabsTrigger value="quote">School Quote Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="mt-6">
            <SchoolQuoteBuilder />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6 space-y-6">

        
        <Tabs value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="low">Low (×0.5)</TabsTrigger>
            <TabsTrigger value="base">Base (×1)</TabsTrigger>
            <TabsTrigger value="high">High (×2)</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* INPUTS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Schools
                </CardTitle>
                <CardDescription>Set monthly price per tier and number of schools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <PriceInput label="Starter price/mo" value={schoolPrices.starter} onChange={(n) => setSchoolPrices({...schoolPrices, starter: n})} />
                  <PriceInput label="Pro price/mo" value={schoolPrices.pro} onChange={(n) => setSchoolPrices({...schoolPrices, pro: n})} />
                  <PriceInput label="Enterprise price/mo" value={schoolPrices.enterprise} onChange={(n) => setSchoolPrices({...schoolPrices, enterprise: n})} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <NumInput label="# Starter schools (25 students)" value={schoolCounts.starter} onChange={(n) => setSchoolCounts({...schoolCounts, starter: n})} />
                  <NumInput label="# Pro schools (75 students)" value={schoolCounts.pro} onChange={(n) => setSchoolCounts({...schoolCounts, pro: n})} />
                  <NumInput label="# Enterprise (150 students)" value={schoolCounts.enterprise} onChange={(n) => setSchoolCounts({...schoolCounts, enterprise: n})} />
                </div>
              </CardContent>
            </Card>

            {/* Tutors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4" /> Tutors
                </CardTitle>
                <CardDescription>
                  Solo {fmtKZT(PRICING_CONFIG.tutors[0].monthlyPriceKZT)}/mo · Pro {fmtKZT(PRICING_CONFIG.tutors[1].monthlyPriceKZT)}/mo · Business {fmtKZT(PRICING_CONFIG.tutors[2].monthlyPriceKZT)}/mo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <NumInput label="# Solo (5 students)" value={tutorCounts.solo} onChange={(n) => setTutorCounts({...tutorCounts, solo: n})} />
                  <NumInput label="# Professional (15 students)" value={tutorCounts.pro} onChange={(n) => setTutorCounts({...tutorCounts, pro: n})} />
                  <NumInput label="# Business (40 students)" value={tutorCounts.business} onChange={(n) => setTutorCounts({...tutorCounts, business: n})} />
                </div>
              </CardContent>
            </Card>

            {/* Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4" /> Variable & Fixed Costs
                </CardTitle>
                <CardDescription>AI/ElevenLabs/infra per active student + monthly fixed</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <PriceInput label="Cost per school student/mo" value={costPerStudent} onChange={setCostPerStudent} />
                <PriceInput label="Cost per tutor student/mo" value={costPerTutorStudent} onChange={setCostPerTutorStudent} />
                <PriceInput label="Fixed monthly costs" value={fixedMonthlyCosts} onChange={setFixedMonthlyCosts} />
              </CardContent>
            </Card>
          </div>

          {/* RESULTS */}
          <div className="space-y-6">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" /> Monthly P&L
                </CardTitle>
                <CardDescription className="capitalize">{scenario} scenario</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <StatRow label="School revenue" value={fmtKZT(Math.round(calc.schoolGross))} />
                  <StatRow label="Tutor revenue" value={fmtKZT(Math.round(calc.tutorGross))} />
                  <Separator className="my-2" />
                  <StatRow label="Gross revenue (incl. VAT)" value={fmtKZT(Math.round(calc.grossRevenue))} bold />
                  <StatRow label="− VAT 12%" value={`(${fmtKZT(Math.round(calc.vatOwed))})`} negative />
                  <StatRow label="Net revenue (ex-VAT)" value={fmtKZT(Math.round(calc.netRevenueExVAT))} bold />

                  <Separator className="my-2" />
                  <StatRow label="− Stripe fees (2.9% + ₸150)" value={`(${fmtKZT(Math.round(calc.stripeFees))})`} negative />
                  <StatRow label={`− Variable costs (${Math.round(calc.schoolStudents + calc.tutorStudents)} students)`} value={`(${fmtKZT(Math.round(calc.variableCosts))})`} negative />
                  <StatRow label="− Fixed costs" value={`(${fmtKZT(Math.round(calc.fixedMonthlyCosts))})`} negative />

                  <Separator className="my-2" />
                  <StatRow label="Profit before tax" value={fmtKZT(Math.round(calc.profitBeforeTax))} bold />
                  <StatRow label="− Corporate tax 20%" value={`(${fmtKZT(Math.round(calc.cit))})`} negative />

                  <Separator className="my-2" />
                  <StatRow label="Net profit / month" value={fmtKZT(Math.round(calc.netProfit))} bold accent />
                  <StatRow label="Net profit / year" value={fmtKZT(Math.round(calc.annual))} bold accent />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <StatRow label="Total subscriptions" value={String(Math.round(
                  (schoolCounts.starter + schoolCounts.pro + schoolCounts.enterprise +
                   tutorCounts.solo + tutorCounts.pro + tutorCounts.business) * SCENARIO_MULTIPLIERS[scenario]
                ))} />
                <StatRow label="School students served" value={String(Math.round(calc.schoolStudents))} />
                <StatRow label="Tutor students served" value={String(Math.round(calc.tutorStudents))} />
                <StatRow label="Profit margin" value={calc.grossRevenue > 0 ? `${((calc.netProfit / calc.grossRevenue) * 100).toFixed(1)}%` : "—"} />
              </CardContent>
            </Card>
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
