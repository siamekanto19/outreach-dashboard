import { eq } from "drizzle-orm";
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
  improve: protectedProcedure
    .input(
      z.object({
        systemPrompt: z.string().trim().min(1),
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
