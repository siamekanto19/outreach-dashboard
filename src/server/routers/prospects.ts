import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { prospectSources, prospects } from "@/db/schema";
import { getProspectsForUser } from "@/server/data/prospects";
import { protectedProcedure, router } from "@/server/trpc";
import { completeWithImage, completeWithOpenRouter } from "@/server/ai/openrouter";
import { scrapeUrlWithFirecrawl } from "@/server/scraping/firecrawl";

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

type ExtractedProfile = {
  name?: string;
  role?: string;
  company?: string;
  summary?: string;
  skills?: string[];
  experience?: string[];
};

type ScrapedSource = {
  type: string;
  url: string;
  rawContent: string;
  extractedSummary: string | null;
  status: string;
};

async function extractFromImage(imageBase64: string): Promise<ExtractedProfile | undefined> {
  try {
    const extraction = await completeWithImage(
      "Extract professional profile information from a LinkedIn screenshot or profile image. Return JSON with keys: name (string), role (string), company (string), summary (string describing their professional background), skills (array of strings), experience (array of short strings describing key roles/achievements).",
      "Extract the professional profile information from this image.",
      imageBase64,
      { jsonOutput: true },
    );

    return JSON.parse(extraction) as ExtractedProfile;
  } catch {
    return undefined;
  }
}

async function scrapeAndExtractSource(type: string, url: string): Promise<ScrapedSource> {
  try {
    const scraped = await scrapeUrlWithFirecrawl(url);
    const extraction = await completeWithOpenRouter(
      [
        {
          role: "system",
          content:
            "Extract professional context from this webpage about a person or company. Return JSON with keys: summary (a concise paragraph about what this page reveals about the person/company), highlights (array of short strings for key facts). If the page is a GitHub profile, focus on repos, languages, and projects. If a company site, focus on what the company does and the person's role.",
        },
        {
          role: "user",
          content: [
            `Page title: ${scraped.title || "unknown"}`,
            `Page description: ${scraped.description || "unknown"}`,
            "",
            scraped.markdown.slice(0, 10000),
          ].join("\n"),
        },
      ],
      { jsonOutput: true },
    );

    const parsed = JSON.parse(extraction) as { summary?: string; highlights?: string[] };
    const summary = parsed.summary || null;

    return {
      type,
      url: normalizeUrl(url),
      rawContent: scraped.markdown.slice(0, 5000),
      extractedSummary: summary,
      status: "completed",
    };
  } catch {
    return {
      type,
      url: normalizeUrl(url),
      rawContent: "",
      extractedSummary: null,
      status: "failed",
    };
  }
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
        linkedinImage: z.string().trim().optional(),
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

      let extracted: ExtractedProfile | undefined;
      if (input.linkedinImage) {
        extracted = await extractFromImage(input.linkedinImage);
      }

      const scrapedSources = await Promise.all(
        sourceInputs.map((source) => scrapeAndExtractSource(source.type, source.url)),
      );

      const websiteSummaries = scrapedSources
        .filter((s) => s.extractedSummary)
        .map((s) => s.extractedSummary);

      const combinedSummary = [
        extracted?.summary,
        ...websiteSummaries,
      ]
        .filter(Boolean)
        .join("\n\n") || null;

      const aiSummary = combinedSummary;
      const company = input.company || extracted?.company || null;
      const role = input.role || extracted?.role || null;
      const manualContext = input.manualContext || null;

      await db.transaction(async (tx) => {
        await tx.insert(prospects).values({
          id: prospectId,
          userId: ctx.user.id,
          name: input.name,
          company,
          role,
          manualContext,
          aiProfileSummary: aiSummary,
          tags: csv(input.tags),
        });

        for (const source of scrapedSources) {
          await tx.insert(prospectSources).values({
            id: crypto.randomUUID(),
            prospectId,
            type: source.type,
            url: source.url,
            rawContent: source.rawContent,
            extractedSummary: source.extractedSummary,
            status: source.status,
          });
        }

        if (input.linkedinImage) {
          await tx.insert(prospectSources).values({
            id: crypto.randomUUID(),
            prospectId,
            type: "LinkedIn Screenshot",
            rawContent: input.linkedinImage.slice(0, 100) + "...",
            extractedSummary: extracted?.summary || null,
            status: "completed",
          });
        }
      });

      return { ok: true };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, "Prospect name is required."),
        company: z.string().trim().optional(),
        role: z.string().trim().optional(),
        manualContext: z.string().trim().optional(),
        tags: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(prospects)
        .where(
          and(eq(prospects.id, input.id), eq(prospects.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new Error("Prospect not found.");
      }

      await db
        .update(prospects)
        .set({
          name: input.name,
          company: input.company || existing.company,
          role: input.role || existing.role,
          manualContext: input.manualContext ?? existing.manualContext,
          tags: csv(input.tags).length ? csv(input.tags) : existing.tags,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, input.id));

      return { ok: true };
    }),
});
