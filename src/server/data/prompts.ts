/*
 * Prompt defaults and lookup helpers.
 * Ensures every user has a usable default outreach system prompt before they
 * customize prompts for specific offering/prospect contexts.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { prompts } from "@/db/schema";

export const DEFAULT_SYSTEM_PROMPT =
  "Write a conversational outreach message under 100 words. Lead with one specific, relevant observation about the prospect before mentioning the offering. Keep it human, direct, and non-salesy. Avoid hype, generic compliments, and hard asks. End with a soft question.";

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
        name: "Default outreach prompt",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        tone: "Conversational",
        lengthPreference: "Under 100 words",
        avoidList: ["generic compliments", "salesy language", "hard asks"],
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
