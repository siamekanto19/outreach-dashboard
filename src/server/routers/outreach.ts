import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  conversationMessages,
  conversations,
  generatedMessages,
  offerings,
  prospects,
} from "@/db/schema";
import { completeWithOpenRouter } from "@/server/ai/openrouter";
import { getDefaultPromptForUser } from "@/server/data/prompts";
import { protectedProcedure, router } from "@/server/trpc";

export const outreachRouter = router({
  generateMessage: protectedProcedure
    .input(
      z.object({
        offeringId: z.string().min(1, "Select an offering."),
        prospectId: z.string().min(1, "Select a prospect."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [[offering], [prospect], prompt] = await Promise.all([
        db
          .select()
          .from(offerings)
          .where(
            and(
              eq(offerings.id, input.offeringId),
              eq(offerings.userId, ctx.user.id),
            ),
          )
          .limit(1),
        db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.id, input.prospectId),
              eq(prospects.userId, ctx.user.id),
            ),
          )
          .limit(1),
        getDefaultPromptForUser(ctx.user.id),
      ]);

      if (!offering || !prospect) {
        throw new Error("Selected offering or prospect was not found.");
      }

      const content = await completeWithOpenRouter([
        {
          role: "system",
          content: prompt.systemPrompt,
        },
        {
          role: "user",
          content: [
            "Generate one personalized outbound message.",
            "",
            "Offering:",
            `Name: ${offering.name}`,
            `Website: ${offering.websiteUrl ?? "not provided"}`,
            `Context: ${offering.aiSummary || offering.manualContext}`,
            `Target customers: ${offering.targetCustomers ?? "not specified"}`,
            `Proof points: ${offering.proofPoints.join("; ") || "not provided"}`,
            `Positioning: ${offering.positioning ?? "not provided"}`,
            "",
            "Prospect:",
            `Name: ${prospect.name}`,
            `Role: ${prospect.role ?? "not specified"}`,
            `Company: ${prospect.company ?? "not specified"}`,
            `Context: ${prospect.aiProfileSummary || prospect.manualContext || "not provided"}`,
            `Tags: ${prospect.tags.join(", ") || "none"}`,
            "",
            "Return only the message text.",
          ].join("\n"),
        },
      ]);

      const generatedMessageId = crypto.randomUUID();
      const conversationId = crypto.randomUUID();
      const conversationMessageId = crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(generatedMessages).values({
          id: generatedMessageId,
          userId: ctx.user.id,
          prospectId: prospect.id,
          offeringId: offering.id,
          promptId: prompt.id,
          content,
          tone: prompt.tone,
        });

        await tx.insert(conversations).values({
          id: conversationId,
          userId: ctx.user.id,
          prospectId: prospect.id,
          offeringId: offering.id,
          generatedMessageId,
        });

        await tx.insert(conversationMessages).values({
          id: conversationMessageId,
          userId: ctx.user.id,
          conversationId,
          role: "outbound",
          content,
          generatedMessageId,
        });
      });

      return {
        id: conversationId,
        offeringId: offering.id,
        prospectId: prospect.id,
        createdAt: now.toISOString(),
        messages: [
          {
            id: conversationMessageId,
            role: "outbound" as const,
            content,
            timestamp: now.toISOString(),
            isFavourite: false,
          },
        ],
      };
    }),
  saveReply: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, "Generate a message first."),
        content: z.string().trim().min(1, "Paste a reply first."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversation was not found.");
      }

      const id = crypto.randomUUID();
      const now = new Date();

      await db.insert(conversationMessages).values({
        id,
        userId: ctx.user.id,
        conversationId: conversation.id,
        role: "prospect_reply",
        content: input.content,
      });

      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversation.id));

      return {
        id,
        role: "reply" as const,
        content: input.content,
        timestamp: now.toISOString(),
      };
    }),
  generateFollowUp: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, "Generate a message first."),
        latestReply: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversation was not found.");
      }

      const [[offering], [prospect], prompt, thread] = await Promise.all([
        db
          .select()
          .from(offerings)
          .where(
            and(
              eq(offerings.id, conversation.offeringId),
              eq(offerings.userId, ctx.user.id),
            ),
          )
          .limit(1),
        db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.id, conversation.prospectId),
              eq(prospects.userId, ctx.user.id),
            ),
          )
          .limit(1),
        getDefaultPromptForUser(ctx.user.id),
        db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id))
          .orderBy(asc(conversationMessages.createdAt)),
      ]);

      if (!offering || !prospect) {
        throw new Error("Conversation context is incomplete.");
      }

      let threadForPrompt = thread;
      const shouldSaveLatestReply =
        input.latestReply &&
        !thread.some(
          (message) =>
            message.role === "prospect_reply" &&
            message.content.trim() === input.latestReply?.trim(),
        );

      if (shouldSaveLatestReply) {
        const replyId = crypto.randomUUID();
        await db.insert(conversationMessages).values({
          id: replyId,
          userId: ctx.user.id,
          conversationId: conversation.id,
          role: "prospect_reply",
          content: input.latestReply!,
        });

        threadForPrompt = [
          ...threadForPrompt,
          {
            id: replyId,
            userId: ctx.user.id,
            conversationId: conversation.id,
            role: "prospect_reply",
            content: input.latestReply!,
            generatedMessageId: null,
            rating: null,
            isFavorite: false,
            createdAt: new Date(),
          },
        ];
      }

      const content = await completeWithOpenRouter([
        {
          role: "system",
          content: [
            prompt.systemPrompt,
            "",
            "You are now writing a follow-up reply in an existing conversation. Do not restart the cold outreach. Answer the prospect's latest question directly, preserve the same tone, and keep the conversation moving with one soft next step.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Generate one natural follow-up reply.",
            "",
            "Offering:",
            `Name: ${offering.name}`,
            `Context: ${offering.aiSummary || offering.manualContext}`,
            `Positioning: ${offering.positioning ?? "not provided"}`,
            "",
            "Prospect:",
            `Name: ${prospect.name}`,
            `Role: ${prospect.role ?? "not specified"}`,
            `Company: ${prospect.company ?? "not specified"}`,
            `Context: ${prospect.aiProfileSummary || prospect.manualContext || "not provided"}`,
            "",
            "Conversation so far:",
            ...threadForPrompt.map(
              (message) =>
                `${message.role === "prospect_reply" ? "Prospect" : "You"}: ${message.content}`,
            ),
            "",
            "Return only the follow-up reply text.",
          ].join("\n"),
        },
      ]);

      const id = crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(conversationMessages).values({
          id,
          userId: ctx.user.id,
          conversationId: conversation.id,
          role: "ai_reply",
          content,
        });

        await tx
          .update(conversations)
          .set({ updatedAt: now })
          .where(eq(conversations.id, conversation.id));
      });

      return {
        id,
        role: "follow-up" as const,
        content,
        timestamp: now.toISOString(),
        isFavourite: false,
      };
    }),
});
