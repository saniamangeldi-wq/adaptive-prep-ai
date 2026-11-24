/**
 * The live SAT Intensive group. Everything a parent sees about dates, price
 * and format comes from here, so changing the offer is a one-file edit.
 *
 * Decisions taken for Cohort 1 (see salvage/90-DAY-PLAN.md); change freely:
 * - 8 weeks, 2 live online lessons a week, starting after New Year holidays,
 *   finishing the week before the 6 March 2027 SAT (next date: 1 May 2027).
 * - ₸75,000 full price; ₸60,000 for the first 10 places until 20 December.
 * - Full refund if a family changes its mind before the first lesson.
 */
export const COHORT = {
  id: "2027-01",
  startDate: "2027-01-12",
  endDate: "2027-03-04",
  weeks: 8,
  lessonsPerWeek: 2,
  lessonMinutes: 90,
  /** Shown as-is; set to your real slot before you start selling. */
  schedule: { en: "Tue and Thu, 19:00–20:30 (Astana time)", ru: "Вт и Чт, 19:00–20:30 (по Астане)", kk: "Сс және Бс, 19:00–20:30 (Астана уақыты)" },
  seats: 15,
  priceKZT: 75000,
  earlyBirdKZT: 60000,
  earlyBirdSeats: 10,
  earlyBirdUntil: "2026-12-20",
  /** Official SAT dates this cohort prepares for (College Board, checked 2026-11-24). */
  satDates: ["2027-03-06", "2027-05-01"],
  teacherName: "Sani",
} as const;

export function isEarlyBird(now = new Date()): boolean {
  return now <= new Date(`${COHORT.earlyBirdUntil}T23:59:59+05:00`);
}

export function formatDate(iso: string, lang: string): string {
  const locale = lang === "kk" ? "kk-KZ" : lang === "ru" ? "ru-RU" : "en-GB";
  return new Date(`${iso}T12:00:00+05:00`).toLocaleDateString(locale, { day: "numeric", month: "long" });
}
