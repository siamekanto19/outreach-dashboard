import { z } from "zod";
import { db } from "@/db";
import { prospectSources, prospects } from "@/db/schema";
import { getProspectsForUser } from "@/server/data/prospects";
import { protectedProcedure, router } from "@/server/trpc";

function csv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export const prospectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return getProspectsForUser(ctx.user.id);
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Prospect name is required."),
        company: z.string().trim().optional(),
        role: z.string().trim().optional(),
        manualContext: z.string().trim().optional(),
        tags: z.string().trim().optional(),
        githubUrl: z.string().trim().optional(),
        personalUrl: z.string().trim().optional(),
        companyUrl: z.string().trim().optional(),
        customUrl: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const prospectId = crypto.randomUUID();
      const sourceInputs = [
        { type: "GitHub", url: input.githubUrl },
        { type: "Personal Website", url: input.personalUrl },
        { type: "Company Website", url: input.companyUrl },
        { type: "Additional URL", url: input.customUrl },
      ].filter((source): source is { type: string; url: string } =>
        Boolean(source.url),
      );

      await db.transaction(async (tx) => {
        await tx.insert(prospects).values({
          id: prospectId,
          userId: ctx.user.id,
          name: input.name,
          company: input.company || null,
          role: input.role || null,
          manualContext: input.manualContext || null,
          tags: csv(input.tags),
        });

        if (sourceInputs.length) {
          await tx.insert(prospectSources).values(
            sourceInputs.map((source) => ({
              id: crypto.randomUUID(),
              prospectId,
              type: source.type,
              url: normalizeUrl(source.url),
              status: "pending",
            })),
          );
        }
      });

      return { ok: true };
    }),
});
