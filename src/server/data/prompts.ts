/*
 * Prompt defaults and lookup helpers.
 * Ensures every user has a usable default outreach system prompt before they
 * customize prompts for specific offering/prospect contexts.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { prompts } from "@/db/schema";
import { DEFAULT_PROMPT_VALUES } from "@/lib/default-prompt";

export async function getDefaultPromptForUser(userId: string) {
  const [existingDefault] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.userId, userId), eq(prompts.isDefault, true)))
    .limit(1);

  if (existingDefault) {
    return existingDefault;
  }

  try {
    const [created] = await db
      .insert(prompts)
      .values({
        id: crypto.randomUUID(),
        userId,
        name: DEFAULT_PROMPT_VALUES.name,
        systemPrompt: DEFAULT_PROMPT_VALUES.systemPrompt,
        tone: DEFAULT_PROMPT_VALUES.tone,
        lengthPreference: DEFAULT_PROMPT_VALUES.lengthPreference,
        avoidList: DEFAULT_PROMPT_VALUES.avoidList.split("\n"),
        isDefault: true,
      })
      .returning();

    return created;
  } catch {
    const [createdByConcurrentRequest] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.userId, userId), eq(prompts.isDefault, true)))
      .limit(1);

    if (createdByConcurrentRequest) {
      return createdByConcurrentRequest;
    }

    throw new Error("Could not create default outreach prompt.");
  }
}
