// Allowlist of user IDs that can access the Revenue Calculator.
// Add more user IDs here to grant access to additional people.
export const CALCULATOR_ALLOWED_USER_IDS = new Set<string>([
  "6b2ba85b-4c09-4f6a-9d96-b65bcc7e2771", // sani.amangeldi@gmail.com
  "3901e323-86da-46bc-a738-35e2913096cc", // sani.amangeldi09@gmail.com
]);

export function canAccessCalculator(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return CALCULATOR_ALLOWED_USER_IDS.has(userId);
}
