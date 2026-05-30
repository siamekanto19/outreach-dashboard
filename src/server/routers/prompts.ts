import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prompts } from "@/db/schema";
import { completeWithOpenRouter } from "@/server/ai/openrouter";
import { getDefaultPromptForUser } from "@/server/data/prompts";
import { protectedProcedure, router } from "@/server/trpc";

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

function splitAvoidList(value?: string) {
  return (value ?? "")
    .split("\n")
    .flatMap((line) => line.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export const promptsRouter = router({
  default: protectedProcedure.query(async ({ ctx }) => {
    const prompt = await getDefaultPromptForUser(ctx.user.id);

    return {
      id: prompt.id,
      name: prompt.name,
      systemPrompt: prompt.systemPrompt,
      tone: prompt.tone ?? "",
      lengthPreference: prompt.lengthPreference ?? "",
      avoidList: prompt.avoidList.join("\n"),
    };
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
          return {
            id: customPrompt.id,
            name: customPrompt.name,
            systemPrompt: customPrompt.systemPrompt,
            tone: customPrompt.tone ?? "",
            lengthPreference: customPrompt.lengthPreference ?? "",
            avoidList: customPrompt.avoidList.join("\n"),
            isCustom: true,
          };
        }
      }

      const defaultPrompt = await getDefaultPromptForUser(ctx.user.id);
      return {
        id: defaultPrompt.id,
        name: defaultPrompt.name,
        systemPrompt: defaultPrompt.systemPrompt,
        tone: defaultPrompt.tone ?? "",
        lengthPreference: defaultPrompt.lengthPreference ?? "",
        avoidList: defaultPrompt.avoidList.join("\n"),
        isCustom: false,
      };
    }),
  updateDefault: protectedProcedure
    .input(promptInput)
    .mutation(async ({ ctx, input }) => {
      const prompt = await getDefaultPromptForUser(ctx.user.id);

      const [updated] = await db
        .update(prompts)
        .set({
          name: input.name,
          systemPrompt: input.systemPrompt,
          tone: input.tone || null,
          lengthPreference: input.lengthPreference || null,
          avoidList: splitAvoidList(input.avoidList),
          updatedAt: new Date(),
        })
        .where(eq(prompts.id, prompt.id))
        .returning();

      return {
        id: updated.id,
        name: updated.name,
        systemPrompt: updated.systemPrompt,
        tone: updated.tone ?? "",
        lengthPreference: updated.lengthPreference ?? "",
        avoidList: updated.avoidList.join("\n"),
      };
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
          .set({
            name: input.name,
            systemPrompt: input.systemPrompt,
            tone: input.tone || null,
            lengthPreference: input.lengthPreference || null,
            avoidList: splitAvoidList(input.avoidList),
            updatedAt: new Date(),
          })
          .where(eq(prompts.id, existing.id))
          .returning();

        return {
          id: updated.id,
          name: updated.name,
          systemPrompt: updated.systemPrompt,
          tone: updated.tone ?? "",
          lengthPreference: updated.lengthPreference ?? "",
          avoidList: updated.avoidList.join("\n"),
          isCustom: true,
        };
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
            avoidList: splitAvoidList(input.avoidList),
            isDefault: false,
          })
          .returning();

        return {
          id: created.id,
          name: created.name,
          systemPrompt: created.systemPrompt,
          tone: created.tone ?? "",
          lengthPreference: created.lengthPreference ?? "",
          avoidList: created.avoidList.join("\n"),
          isCustom: true,
        };
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
