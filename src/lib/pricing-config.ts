export const BILLING_MULTIPLIERS = {
  monthly: 1,
  term: 0.9,
  yearly: 0.8,
} as const;

export const BILLING_PERIOD_MONTHS = {
  monthly: 1,
  term: 3,
  yearly: 12,
} as const;

export type BillingCycle = keyof typeof BILLING_MULTIPLIERS;

export function calcPrice(base: number, cycle: BillingCycle): number {
  return Math.round(base * BILLING_MULTIPLIERS[cycle]);
}

export function fmtKZT(amount: number): string {
  return `₸${amount.toLocaleString("ru-RU")}`;
}

export function fmtUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export interface StudentPlan {
  id: string;
  tier: string;
  /** Billing tier stored on profiles.tier and used for the Stripe link; null = free. */
  stripeTier: "tier_1" | "tier_2" | "tier_3" | null;
  name: string;
  badge: string | null;
  description: string;
  monthlyPriceKZT: number;
  monthlyPriceUSD: number;
  mostPopular: boolean;
  features: string[];
}

export interface TutorPlan {
  id: string;
  tier: string;
  /** Billing tier stored on profiles.tier and used for the Stripe link; null = free. */
  stripeTier: "tier_1" | "tier_2" | "tier_3" | null;
  name: string;
  badge: string | null;
  description: string;
  monthlyPriceKZT: number;
  monthlyPriceUSD: number;
  mostPopular: boolean;
  features: string[];
}

export interface SchoolPlan {
  id: string;
  tier: string;
  name: string;
  badge: string | null;
  description: string;
  monthlyPriceKZT: number | null;
  monthlyPriceUSD: number | null;
  mostPopular: boolean;
  baseStudents: number | null;
  bundledTeachers: number;
  features: string[];
}

export const PRICING_CONFIG = {
  students: [
    {
      id: "student-free",
      tier: "Tier 1",
      stripeTier: null,
      name: "Free",
      badge: null,
      description: "Curious students, first-timers.",
      monthlyPriceKZT: 0,
      monthlyPriceUSD: 0,
      mostPopular: false,
      features: [
        "5 AI questions/day",
        "3 quizzes/week",
        "Basic dashboard",
      ],
    },
    {
      id: "student-pro",
      tier: "Tier 2",
      stripeTier: "tier_2",
      name: "Pro",
      badge: "Most Popular",
      description: "Everything you need to prepare for the Digital SAT.",
      monthlyPriceKZT: 4990,
      monthlyPriceUSD: 10,
      mostPopular: true,
      features: [
        "100 AI questions/day",
        "Unlimited quizzes",
        "Full-length practice tests with score reports",
        "Progress tracking",
      ],
    },
  ] as StudentPlan[],
  tutors: [
    {
      id: "tutor-solo",
      tier: "Tier 1",
      stripeTier: "tier_1",
      name: "Tutor",
      badge: null,
      description: "For individual tutors with a few students.",
      monthlyPriceKZT: 29500,
      monthlyPriceUSD: 59,
      mostPopular: false,
      features: [
        "Up to 5 students",
        "Student progress tracking",
        "AI Coach for all students",
        "Basic analytics dashboard",
        "Email support",
        "Custom test assignments",
      ],
    },
  ] as TutorPlan[],
  schools: [
    {
      id: "school-starter",
      tier: "Tier 1",
      name: "School Starter",
      badge: null,
      description: "Perfect for schools piloting AI-powered learning.",
      monthlyPriceKZT: null,
      monthlyPriceUSD: null,
      mostPopular: false,
      baseStudents: 25,
      bundledTeachers: 3,
      features: [
        "25 student accounts included",
        "3 teacher accounts included",
        "Teacher dashboard",
        "Bulk student onboarding",
        "Standard analytics",
        "AI study sessions for all students",
        "Quiz + test generation",
        "University matching",
        "Email support",
      ],
    },
    {
      id: "school-pro",
      tier: "Tier 2",
      name: "School Pro",
      badge: "Most Popular",
      description: "For growing schools ready for full AI integration.",
      monthlyPriceKZT: null,
      monthlyPriceUSD: null,
      mostPopular: true,
      baseStudents: 75,
      bundledTeachers: 8,
      features: [
        "75 student accounts included",
        "8 teacher accounts included",
        "Everything in School Starter",
        "Advanced school-wide analytics",
        "Parent portal",
        "Department management",
        "Custom test creation",
        "Priority support SLA",
      ],
    },
    {
      id: "school-enterprise",
      tier: "Tier 3",
      name: "Enterprise",
      badge: null,
      description: "Custom solution for large institutions and districts.",
      monthlyPriceKZT: null,
      monthlyPriceUSD: null,
      mostPopular: false,
      baseStudents: null,
      bundledTeachers: Infinity,
      features: [
        "75+ students (custom volume)",
        "Unlimited teacher accounts",
        "Full white-label branding",
        "API + LMS integration",
        "Dedicated success manager",
        "On-site onboarding available",
        "Volume discounts",
        "Custom contract and invoicing",
      ],
    },
  ] as SchoolPlan[],
  schoolOverage: {
    labelKZT: "₸49,500",
    labelUSD: "$99",
    studentsPerBlock: 25,
    monthlyPriceKZT: 49500,
    monthlyPriceUSD: 99,
    description: "Add 25 more students to any school plan",
  },
  teacherAddOn: {
    priceUSD: 25,
    priceKZT: 12500,
    label: "+1 Teacher (beyond bundled limit)",
    description: "Adds 1 extra teacher account to any school plan",
  },
};
