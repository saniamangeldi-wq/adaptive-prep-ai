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
      description: "Get started with AI-powered learning at no cost.",
      monthlyPriceKZT: 0,
      monthlyPriceUSD: 0,
      mostPopular: false,
      features: [
        "5 AI study sessions/month",
        "Basic quiz generation",
        "University matching (limited)",
        "ElevenLabs voice (10 min/month)",
      ],
    },
    {
      id: "student-basic",
      tier: "Tier 2",
      name: "Basic",
      badge: null,
      description: "For students who want consistent AI support.",
      monthlyPriceKZT: 2500,
      monthlyPriceUSD: 5,
      mostPopular: false,
      features: [
        "30 AI study sessions/month",
        "Quiz + practice test generation",
        "University matching (standard)",
        "ElevenLabs voice (60 min/month)",
        "Learning style profile",
      ],
    },
    {
      id: "student-pro",
      tier: "Tier 3",
      name: "Pro",
      badge: "Most Popular",
      description: "The full MET.AI experience for serious students.",
      monthlyPriceKZT: 4990,
      monthlyPriceUSD: 10,
      mostPopular: true,
      features: [
        "Unlimited AI study sessions",
        "Advanced quiz + test generation",
        "Full university matching",
        "ElevenLabs voice (unlimited)",
        "Real-time learning style adaptation",
        "Progress analytics dashboard",
      ],
    },
    {
      id: "student-elite",
      tier: "Tier 4",
      name: "Elite",
      badge: null,
      description: "Maximum power for top-performing students.",
      monthlyPriceKZT: 9900,
      monthlyPriceUSD: 21,
      mostPopular: false,
      features: [
        "Everything in Pro",
        "Priority AI response speed",
        "Personalized study roadmap",
        "Early access to new features",
        "Dedicated support",
      ],
    },
  ] as StudentPlan[],
  tutors: [
    {
      id: "tutor-solo",
      tier: "Tier 1",
      name: "Solo Tutor",
      badge: null,
      description: "For independent tutors managing a small student group.",
      monthlyPriceKZT: 14500,
      monthlyPriceUSD: 29,
      mostPopular: false,
      features: [
        "Up to 10 student accounts",
        "AI session monitoring",
        "Quiz assignment tools",
        "Student progress reports",
        "ElevenLabs voice for all students",
      ],
    },
    {
      id: "tutor-pro",
      tier: "Tier 2",
      name: "Tutor Pro",
      badge: "Most Popular",
      description: "For professional tutors who want full control and insights.",
      monthlyPriceKZT: 29000,
      monthlyPriceUSD: 59,
      mostPopular: true,
      features: [
        "Up to 30 student accounts",
        "Everything in Solo Tutor",
        "Advanced learning analytics",
        "Custom quiz builder",
        "University matching for all students",
        "Priority support",
      ],
    },
    {
      id: "tutor-elite",
      tier: "Tier 3",
      name: "Tutor Elite",
      badge: null,
      description: "Premium tier with voice chat and Elite features for all your students.",
      monthlyPriceKZT: 49500,
      monthlyPriceUSD: 99,
      mostPopular: false,
      features: [
        "Up to 50 student accounts",
        "Everything in Tutor Pro",
        "ElevenLabs voice chat (tutor & students)",
        "Students get full Elite features",
        "200 AI credits/day for students",
        "Deep Research + Reasoning Pro",
        "Unlimited flashcards for students",
        "Dedicated support",
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
