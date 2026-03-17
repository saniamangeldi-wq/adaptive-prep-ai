import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FINANCIAL_CONFIG, IntakeData } from "./types";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Props {
  universityName: string;
  city: string;
  country: string;
  onSubmit: (data: IntakeData) => void;
  isLoading: boolean;
}

export function FinancialIntakeForm({ universityName, city, country, onSubmit, isLoading }: Props) {
  const [step, setStep] = useState(1);
  const [enrollmentMonth, setEnrollmentMonth] = useState(9);
  const [enrollmentYear, setEnrollmentYear] = useState(FINANCIAL_CONFIG.currentYear + 1);
  const [expenses, setExpenses] = useState<Record<string, number>>(
    Object.fromEntries(FINANCIAL_CONFIG.expenseCategories.map((c) => [c.key, 0]))
  );
  const [familyContribution, setFamilyContribution] = useState(0);
  const [currentSavings, setCurrentSavings] = useState(0);

  const years = Array.from({ length: 5 }, (_, i) => FINANCIAL_CONFIG.currentYear + i);

  const handleSubmit = () => {
    onSubmit({
      universityName,
      city,
      country,
      enrollmentMonth,
      enrollmentYear,
      expenses,
      familyContribution,
      currentSavings,
    });
  };

  const canNext = step < 4;
  const canBack = step > 1;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {step} of 4</span>
          <span>{Math.round((step / 4) * 100)}%</span>
        </div>
        <Progress value={(step / 4) * 100} className="h-2 bg-[#2D3748] [&>div]:bg-[#10B981]" />
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">University Details</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-xs">Target University</Label>
              <Input value={universityName} readOnly className="bg-muted/30 border-[#2D3748]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-xs">City</Label>
                <Input value={city} readOnly className="bg-muted/30 border-[#2D3748]" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Country</Label>
                <Input value={country} readOnly className="bg-muted/30 border-[#2D3748]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-xs">Enrollment Month</Label>
                <Select value={String(enrollmentMonth)} onValueChange={(v) => setEnrollmentMonth(Number(v))}>
                  <SelectTrigger className="border-[#2D3748]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Enrollment Year</Label>
                <Select value={String(enrollmentYear)} onValueChange={(v) => setEnrollmentYear(Number(v))}>
                  <SelectTrigger className="border-[#2D3748]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Monthly Spending in Kazakhstan</h3>
          <p className="text-sm text-muted-foreground">How much do you currently spend per month in Kazakhstan?</p>
          <div className="space-y-3">
            {FINANCIAL_CONFIG.expenseCategories.map((cat) => (
              <div key={cat.key} className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-40 flex-shrink-0">{cat.label}</Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="e.g. 15000"
                    value={expenses[cat.key] || ""}
                    onChange={(e) => setExpenses((p) => ({ ...p, [cat.key]: Number(e.target.value) || 0 }))}
                    className="border-[#2D3748] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Family Support & Savings</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Family monthly contribution toward education</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="e.g. 200000"
                  value={familyContribution || ""}
                  onChange={(e) => setFamilyContribution(Number(e.target.value) || 0)}
                  className="border-[#2D3748] pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸</span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Current total savings</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={currentSavings || ""}
                  onChange={(e) => setCurrentSavings(Number(e.target.value) || 0)}
                  className="border-[#2D3748] pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">This is the total you have saved right now, not monthly income</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Review & Submit</h3>
          <div className="rounded-xl border border-[#2D3748] bg-muted/20 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">University</span>
              <span className="text-foreground font-medium">{universityName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground">{city}, {country}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Enrollment</span>
              <span className="text-foreground">{MONTHS[enrollmentMonth - 1]} {enrollmentYear}</span>
            </div>
            <div className="border-t border-[#2D3748] pt-2">
              <p className="text-xs text-muted-foreground mb-1">Monthly Expenses (₸)</p>
              {FINANCIAL_CONFIG.expenseCategories.map((cat) =>
                expenses[cat.key] > 0 ? (
                  <div key={cat.key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="text-foreground">₸{expenses[cat.key].toLocaleString()}</span>
                  </div>
                ) : null
              )}
            </div>
            <div className="border-t border-[#2D3748] pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Family contribution</span>
                <span className="text-foreground">₸{familyContribution.toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current savings</span>
                <span className="text-foreground">₸{currentSavings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {canBack && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="border-[#2D3748] gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <div className="flex-1" />
        {canNext && (
          <Button onClick={() => setStep(step + 1)} className="bg-[#10B981] hover:bg-[#10B981]/80 text-white gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {step === 4 && (
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#10B981] hover:bg-[#10B981]/80 text-white gap-2 w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Researching costs...
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate My Financial Report
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
