export interface AuthorizedSpaceContext {
  name: string;
  description: string | null;
  ai_instructions: string | null;
  references: unknown;
}

export async function loadAuthorizedSpace(
  client: any,
  userId: string,
  spaceId: unknown,
): Promise<{
  space: AuthorizedSpaceContext | null;
  error: unknown;
  unauthorized: boolean;
}> {
  if (typeof spaceId !== "string" || !spaceId.trim()) {
    return { space: null, error: null, unauthorized: false };
  }

  const { data, error } = await client
    .from("conversation_spaces")
    .select("name, description, ai_instructions, references")
    .eq("id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    space: data ?? null,
    error,
    unauthorized: !error && !data,
  };
}

export function appendSpaceContext(
  systemPrompt: string,
  space: AuthorizedSpaceContext | null,
): string {
  if (!space) return systemPrompt;

  let context = `${systemPrompt}\n\nSELECTED STUDY SPACE: ${space.name}`;
  if (space.description) context += `\nDescription: ${space.description}`;
  if (space.ai_instructions) context += `\nSpace instructions: ${space.ai_instructions}`;

  const references = Array.isArray(space.references) ? space.references : [];
  for (const reference of references) {
    if (!reference || typeof reference !== "object") continue;
    const item = reference as { name?: unknown; content?: unknown };
    if (typeof item.content !== "string" || !item.content.trim()) continue;
    context += `\n\n[SPACE REFERENCE: ${typeof item.name === "string" ? item.name : "Untitled"}]\n${item.content.slice(0, 5000)}`;
  }

  return context;
}

export async function consumeAiCredits(
  client: any,
  userId: string,
  cost: number,
): Promise<{ reserved: boolean; error: unknown }> {
  const { data, error } = await client.rpc("consume_ai_credits", {
    p_user_id: userId,
    p_cost: cost,
  });

  return {
    reserved: !error && Array.isArray(data) && data.length > 0,
    error,
  };
}

export async function refundAiCredits(
  client: any,
  userId: string,
  cost: number,
): Promise<void> {
  const { error } = await client.rpc("refund_ai_credits", {
    p_user_id: userId,
    p_cost: cost,
  });
  if (error) console.error("Failed to refund AI credit:", error);
}

export function getDailyCreditLimit(tier: string, isTrial: boolean): number {
  if (isTrial) return 75;
  return {
    tier_0: 15,
    tier_1: 40,
    tier_2: 100,
    tier_3: 200,
  }[tier] ?? 15;
}
