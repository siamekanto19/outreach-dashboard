/*
 * Offerings tRPC router.
 * Handles user-scoped offering listing, creation, website scraping, AI
 * extraction, and edits for the value proposition used in outreach generation.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerings } from "@/db/schema";
import { completeWithOpenRouter } from "@/server/ai/openrouter";
import { getOfferingsForUser } from "@/server/data/offerings";
import { scrapeUrlWithFirecrawl } from "@/server/scraping/firecrawl";
import { protectedProcedure, router } from "@/server/trpc";

function lines(value?: string) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeUrl(value?: string) {
  const url = value?.trim();

  if (!url) {
    return null;
  }

  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

type ExtractedOffering = {
  summary?: string;
  targetCustomers?: string | string[];
  positioning?: string;
  proofPoints?: string[];
  painPoints?: string[];
};

function notFound(message: string) {
  return new TRPCError({ code: "NOT_FOUND", message });
}

function parseExtractedOffering(value: string): ExtractedOffering {
  try {
    return JSON.parse(value) as ExtractedOffering;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "AI extraction returned unreadable offering details. Try saving with more manual context or retry the scrape.",
    });
  }
}

export const offeringsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return getOfferingsForUser(ctx.user.id);
  }),
  create: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(1, "Offering name is required."),
          websiteUrl: z.string().trim().optional(),
          manualContext: z.string().trim().optional(),
          targetCustomers: z.string().trim().optional(),
          proofPoints: z.string().trim().optional(),
          positioning: z.string().trim().optional(),
        })
        .refine((value) => value.websiteUrl || value.manualContext, {
          message: "Add a website URL or manual context for this offering.",
          path: ["manualContext"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      let scraped:
        | {
            markdown: string;
            title: string;
            description: string;
          }
        | undefined;
      let extracted: ExtractedOffering | undefined;

      if (input.websiteUrl) {
        scraped = await scrapeUrlWithFirecrawl(input.websiteUrl);
        const extraction = await completeWithOpenRouter(
          [
            {
              role: "system",
              content:
                "Extract B2B offering details from scraped website markdown. Return JSON with keys: summary (plain text string), targetCustomers (comma-separated string), positioning (plain text string), proofPoints (array of short strings), painPoints (array of short strings).",
            },
            {
              role: "user",
              content: [
                `Manual user context: ${input.manualContext || "none"}`,
                `Website title: ${scraped.title || "unknown"}`,
                `Website description: ${scraped.description || "unknown"}`,
                "",
                scraped.markdown.slice(0, 14000),
              ].join("\n"),
            },
          ],
          { jsonOutput: true },
        );

        extracted = parseExtractedOffering(extraction);
      }

      const targetCustomers =
        input.targetCustomers ||
        (Array.isArray(extracted?.targetCustomers)
          ? extracted?.targetCustomers?.join(", ")
          : extracted?.targetCustomers) ||
        null;

      await db.insert(offerings).values({
        id: crypto.randomUUID(),
        userId: ctx.user.id,
        name: input.name,
        websiteUrl: normalizeUrl(input.websiteUrl),
        rawWebsiteContent: scraped?.markdown,
        manualContext: input.manualContext ?? "",
        aiSummary: extracted?.summary,
        targetCustomers,
        proofPoints: lines(input.proofPoints).length
          ? lines(input.proofPoints)
          : extracted?.proofPoints ?? [],
        painPoints: extracted?.painPoints ?? [],
        positioning: input.positioning || extracted?.positioning || null,
      });

      return { ok: true };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, "Offering name is required."),
        websiteUrl: z.string().trim().optional(),
        manualContext: z.string().trim().optional(),
        targetCustomers: z.string().trim().optional(),
        proofPoints: z.string().trim().optional(),
        positioning: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(offerings)
        .where(
          and(eq(offerings.id, input.id), eq(offerings.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw notFound("Offering not found.");
      }

      const proofPoints = lines(input.proofPoints);

      await db
        .update(offerings)
        .set({
          name: input.name,
          websiteUrl: normalizeUrl(input.websiteUrl),
          manualContext: input.manualContext ?? "",
          targetCustomers: input.targetCustomers || null,
          proofPoints,
          positioning: input.positioning || null,
          updatedAt: new Date(),
        })
        .where(
          and(eq(offerings.id, input.id), eq(offerings.userId, ctx.user.id)),
        );

      return { ok: true };
    }),
});
