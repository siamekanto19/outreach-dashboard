import { z } from "zod";
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
      let extracted:
        | {
            summary?: string;
            targetCustomers?: string;
            positioning?: string;
            proofPoints?: string[];
            painPoints?: string[];
          }
        | undefined;

      if (input.websiteUrl) {
        scraped = await scrapeUrlWithFirecrawl(input.websiteUrl);
        const extraction = await completeWithOpenRouter([
          {
            role: "system",
            content:
              "Extract B2B offering details from scraped website markdown. Return strict JSON only with keys: summary, targetCustomers, positioning, proofPoints, painPoints. proofPoints and painPoints must be arrays of strings.",
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
        ]);

        try {
          extracted = JSON.parse(extraction) as typeof extracted;
        } catch {
          extracted = {
            summary: extraction,
          };
        }
      }

      await db.insert(offerings).values({
        id: crypto.randomUUID(),
        userId: ctx.user.id,
        name: input.name,
        websiteUrl: normalizeUrl(input.websiteUrl),
        rawWebsiteContent: scraped?.markdown,
        manualContext: input.manualContext ?? "",
        aiSummary: extracted?.summary,
        targetCustomers:
          input.targetCustomers || extracted?.targetCustomers || null,
        proofPoints: lines(input.proofPoints).length
          ? lines(input.proofPoints)
          : extracted?.proofPoints ?? [],
        painPoints: extracted?.painPoints ?? [],
        positioning: input.positioning || extracted?.positioning || null,
      });

      return { ok: true };
    }),
});
