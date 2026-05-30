/*
 * Prompt customization tRPC router.
 * Loads default or context-specific prompts, saves prompt edits, and uses AI to
 * improve system instructions for higher-quality personalized outreach.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prompts } from "@/db/schema";
import { completeWithOpenRouter } from "@/server/ai/openrouter";
import { getDefaultPromptForUser } from "@/server/data/prompts";
import { splitLinesAndCommas } from "@/server/text";
import { protectedProcedure, router } from "@/server/trpc";

type PromptRow = typeof prompts.$inferSelect;

const promptInput = z.object({
  name: z.string().trim().min(1, "Prompt name is required."),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Add a more detailed prompt so generation has clear guidance."),
  tone: z.string().trim().optional(),
  lengthPreference: z.string().trim().optional(),
  avoidList: z.string().trim().optional(),
});

type PromptInput = z.infer<typeof promptInput>;

function mapPromptForm(prompt: PromptRow, isCustom?: boolean) {
  return {
    id: prompt.id,
    name: prompt.name,
    systemPrompt: prompt.systemPrompt,
    tone: prompt.tone ?? "",
    lengthPreference: prompt.lengthPreference ?? "",
    avoidList: prompt.avoidList.join("\n"),
    ...(isCustom === undefined ? {} : { isCustom }),
  };
}

function promptUpdateValues(input: PromptInput) {
  return {
    name: input.name,
    systemPrompt: input.systemPrompt,
    tone: input.tone || null,
    lengthPreference: input.lengthPreference || null,
    avoidList: splitLinesAndCommas(input.avoidList),
    updatedAt: new Date(),
  };
}

export const promptsRouter = router({
  default: protectedProcedure.query(async ({ ctx }) => {
    const prompt = await getDefaultPromptForUser(ctx.user.id);

    return mapPromptForm(prompt);
  }),
  getByContext: protectedProcedure
    .input(
      z.object({
        offeringId: z.string().optional(),
        prospectId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.offeringId && input.prospectId) {
        const [customPrompt] = await db
          .select()
          .from(prompts)
          .where(
            and(
              eq(prompts.userId, ctx.user.id),
              eq(prompts.offeringId, input.offeringId),
              eq(prompts.prospectId, input.prospectId),
            ),
          )
          .limit(1);

        if (customPrompt) {
          return mapPromptForm(customPrompt, true);
        }
      }

      const defaultPrompt = await getDefaultPromptForUser(ctx.user.id);
      return mapPromptForm(defaultPrompt, false);
    }),
  updateDefault: protectedProcedure
    .input(promptInput)
    .mutation(async ({ ctx, input }) => {
      const prompt = await getDefaultPromptForUser(ctx.user.id);

      const [updated] = await db
        .update(prompts)
        .set(promptUpdateValues(input))
        .where(and(eq(prompts.id, prompt.id), eq(prompts.userId, ctx.user.id)))
        .returning();

      return mapPromptForm(updated);
    }),
  saveForContext: protectedProcedure
    .input(
      promptInput.extend({
        offeringId: z.string().min(1),
        prospectId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.userId, ctx.user.id),
            eq(prompts.offeringId, input.offeringId),
            eq(prompts.prospectId, input.prospectId),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(prompts)
          .set(promptUpdateValues(input))
          .where(and(eq(prompts.id, existing.id), eq(prompts.userId, ctx.user.id)))
          .returning();

        return mapPromptForm(updated, true);
      } else {
        const [created] = await db
          .insert(prompts)
          .values({
            id: crypto.randomUUID(),
            userId: ctx.user.id,
            offeringId: input.offeringId,
            prospectId: input.prospectId,
            name: input.name,
            systemPrompt: input.systemPrompt,
            tone: input.tone || null,
            lengthPreference: input.lengthPreference || null,
            avoidList: splitLinesAndCommas(input.avoidList),
            isDefault: false,
          })
          .returning();

        return mapPromptForm(created, true);
      }
    }),
  improve: protectedProcedure
    .input(
      z.object({
        systemPrompt: z.string().trim().min(1, "Instructions are required before rewriting."),
        tone: z.string().trim().optional(),
        lengthPreference: z.string().trim().optional(),
        avoidList: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const improved = await completeWithOpenRouter([
        {
          role: "system",
          content:
            "You are an expert outbound copy strategist. Rewrite user prompts into concise, practical system prompts for AI-generated B2B outreach. Return only the improved prompt text, no bullets unless they are part of the prompt.",
        },
        {
          role: "user",
          content: `Improve this outreach generation prompt so it creates specific, human, non-generic messages.\n\nCurrent prompt:\n${input.systemPrompt}\n\nTone: ${input.tone || "not specified"}\nLength: ${input.lengthPreference || "not specified"}\nAvoid: ${input.avoidList || "not specified"}`,
        },
      ]);

      return { systemPrompt: improved };
    }),
});
