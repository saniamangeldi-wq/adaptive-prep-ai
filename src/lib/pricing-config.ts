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
        "No voice",
      ],
    },
    {
      id: "student-basic",
      tier: "Tier 2",
      name: "Basic",
      badge: null,
      description: "Budget-conscious families.",
      monthlyPriceKZT: 2500,
      monthlyPriceUSD: 5,
      mostPopular: false,
      features: [
        "30 AI questions/day",
        "20 quizzes/month",
        "Progress tracking",
        "No voice",
      ],
    },
    {
      id: "student-pro",
      tier: "Tier 3",
      name: "Pro",
      badge: "Most Popular",
      description: "Core target user — the full MET.AI experience.",
      monthlyPriceKZT: 4990,
      monthlyPriceUSD: 10,
      mostPopular: true,
      features: [
        "100 AI questions/day",
        "Unlimited quizzes",
        "Voice coach",
        "University match",
      ],
    },
    {
      id: "student-elite",
      tier: "Tier 4",
      name: "Elite",
      badge: null,
      description: "Power students, exam prep.",
      monthlyPriceKZT: 9900,
      monthlyPriceUSD: 21,
      mostPopular: false,
      features: [
        "200 AI credits/day",
        "1,000 questions/month",
        "Deep research mode",
        "1-on-1 AI coaching",
      ],
    },
  ] as StudentPlan[],
  tutors: [
    {
      id: "tutor-solo",
      tier: "Tier 1",
      name: "Solo Tutor",
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
    {
      id: "tutor-pro",
      tier: "Tier 2",
      name: "Professional",
      badge: "Most Popular",
      description: "For growing tutoring practices.",
      monthlyPriceKZT: 84500,
      monthlyPriceUSD: 169,
      mostPopular: true,
      features: [
        "Up to 15 students",
        "Advanced progress analytics",
        "Enhanced AI for students",
        "Parent progress reports",
        "Priority support",
        "Custom branding",
        "White-label reports",
      ],
    },
    {
      id: "tutor-business",
      tier: "Tier 3",
      name: "Tutor Business",
      badge: null,
      description: "For established tutoring businesses.",
      monthlyPriceKZT: 224500,
      monthlyPriceUSD: 449,
      mostPopular: false,
      features: [
        "Up to 40 students",
        "Premium AI for all students",
        "White-label reports",
        "API access",
        "Multi-tutor management",
        "Dedicated account manager",
        "Custom integrations",
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
      monthlyPriceKZT: 74500,
      monthlyPriceUSD: 149,
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
      monthlyPriceKZT: 174500,
      monthlyPriceUSD: 349,
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
