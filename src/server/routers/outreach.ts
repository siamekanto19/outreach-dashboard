import { TRPCError } from "@trpc/server";
import { and, asc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  conversationMessages,
  conversations,
  generatedMessages,
  offerings,
  prospects,
  prompts,
} from "@/db/schema";
import { completeWithOpenRouter } from "@/server/ai/openrouter";
import { getDefaultPromptForUser } from "@/server/data/prompts";
import { protectedProcedure, router } from "@/server/trpc";

type PromptRow = typeof prompts.$inferSelect;

function notFound(message: string) {
  return new TRPCError({ code: "NOT_FOUND", message });
}

function badRequest(message: string) {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function promptPreferences(prompt: PromptRow) {
  return [
    prompt.tone ? `Tone: ${prompt.tone}` : null,
    prompt.lengthPreference ? `Length: ${prompt.lengthPreference}` : null,
    prompt.avoidList.length
      ? `Avoid: ${prompt.avoidList.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const outreachRouter = router({
  getConversationByContext: protectedProcedure
    .input(
      z.object({
        offeringId: z.string().min(1),
        prospectId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, ctx.user.id),
            eq(conversations.offeringId, input.offeringId),
            eq(conversations.prospectId, input.prospectId),
          ),
        )
        .limit(1);

      if (!conversation) {
        return null;
      }

      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversation.id))
        .orderBy(asc(conversationMessages.createdAt));

      return {
        id: conversation.id,
        offeringId: conversation.offeringId,
        prospectId: conversation.prospectId,
        createdAt: conversation.createdAt.toISOString(),
        messages: messages.map((message) => ({
          id: message.id,
          role:
            message.role === "prospect_reply"
              ? ("reply" as const)
              : message.role === "ai_reply"
                ? ("follow-up" as const)
                : ("outbound" as const),
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          rating: message.rating ?? undefined,
          isFavourite: message.isFavorite,
        })),
      };
    }),

  generateMessage: protectedProcedure
    .input(
      z.object({
        offeringId: z.string().min(1, "Select an offering."),
        prospectId: z.string().min(1, "Select a prospect."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [[offering], [prospect]] = await Promise.all([
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
      ]);

      if (!offering || !prospect) {
        throw notFound("Selected offering or prospect was not found.");
      }

      // Check if a conversation already exists for this user + offering + prospect
      const [existingConversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, ctx.user.id),
            eq(conversations.offeringId, input.offeringId),
            eq(conversations.prospectId, input.prospectId),
          ),
        )
        .limit(1);

      // Try to find a custom prompt first, fall back to default
      let prompt = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.userId, ctx.user.id),
            eq(prompts.offeringId, input.offeringId),
            eq(prompts.prospectId, input.prospectId),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (!prompt) {
        prompt = await getDefaultPromptForUser(ctx.user.id);
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
            promptPreferences(prompt)
              ? `Prompt preferences:\n${promptPreferences(prompt)}`
              : "Prompt preferences: use the saved system prompt.",
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
      const newConversationId = crypto.randomUUID();
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

        if (existingConversation) {
          await tx.insert(conversationMessages).values({
            id: conversationMessageId,
            userId: ctx.user.id,
            conversationId: existingConversation.id,
            role: "outbound",
            content,
            generatedMessageId,
          });

          await tx
            .update(conversations)
            .set({ updatedAt: now })
            .where(
              and(
                eq(conversations.id, existingConversation.id),
                eq(conversations.userId, ctx.user.id),
              ),
            );
        } else {
          await tx.insert(conversations).values({
            id: newConversationId,
            userId: ctx.user.id,
            prospectId: prospect.id,
            offeringId: offering.id,
            generatedMessageId,
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(conversationMessages).values({
            id: conversationMessageId,
            userId: ctx.user.id,
            conversationId: newConversationId,
            role: "outbound",
            content,
            generatedMessageId,
            createdAt: now,
          });
        }
      });

      const conversationId = existingConversation?.id || newConversationId;
      const allMessages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(asc(conversationMessages.createdAt));

      return {
        id: conversationId,
        offeringId: offering.id,
        prospectId: prospect.id,
        createdAt: (existingConversation?.createdAt || now).toISOString(),
        messages: allMessages.map((message) => ({
          id: message.id,
          role:
            message.role === "prospect_reply"
              ? ("reply" as const)
              : message.role === "ai_reply"
                ? ("follow-up" as const)
                : ("outbound" as const),
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          rating: message.rating ?? undefined,
          isFavourite: message.isFavorite,
        })),
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
        throw notFound("Conversation was not found.");
      }

      const id = crypto.randomUUID();
      const now = new Date();

      await db.insert(conversationMessages).values({
        id,
        userId: ctx.user.id,
        conversationId: conversation.id,
        role: "prospect_reply",
        content: input.content,
        createdAt: now,
      });

      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(
          and(eq(conversations.id, conversation.id), eq(conversations.userId, ctx.user.id)),
        );

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
        throw notFound("Conversation was not found.");
      }

      const [[offering], [prospect], thread] = await Promise.all([
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
        db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id))
          .orderBy(asc(conversationMessages.createdAt)),
      ]);

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      // Try to load custom prompt, otherwise fall back to default
      let prompt = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.userId, ctx.user.id),
            eq(prompts.offeringId, conversation.offeringId),
            eq(prompts.prospectId, conversation.prospectId),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (!prompt) {
        prompt = await getDefaultPromptForUser(ctx.user.id);
      }

      let threadForPrompt = thread;
      let pendingReply:
        | {
            id: string;
            content: string;
            createdAt: Date;
          }
        | null = null;
      const shouldSaveLatestReply =
        input.latestReply &&
        !thread.some(
          (message) =>
            message.role === "prospect_reply" &&
            message.content.trim() === input.latestReply?.trim(),
        );

      if (shouldSaveLatestReply) {
        const replyId = crypto.randomUUID();
        const replyCreatedAt = new Date();
        pendingReply = {
          id: replyId,
          content: input.latestReply!,
          createdAt: replyCreatedAt,
        };

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
            createdAt: replyCreatedAt,
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
            promptPreferences(prompt)
              ? `Prompt preferences:\n${promptPreferences(prompt)}`
              : "Prompt preferences: use the saved system prompt.",
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
      const generatedMessageId = crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        if (pendingReply) {
          await tx.insert(conversationMessages).values({
            id: pendingReply.id,
            userId: ctx.user.id,
            conversationId: conversation.id,
            role: "prospect_reply",
            content: pendingReply.content,
            createdAt: pendingReply.createdAt,
          });
        }

        await tx.insert(generatedMessages).values({
          id: generatedMessageId,
          userId: ctx.user.id,
          prospectId: prospect.id,
          offeringId: offering.id,
          promptId: prompt.id,
          content,
          tone: prompt.tone,
        });

        await tx.insert(conversationMessages).values({
          id: id,
          userId: ctx.user.id,
          conversationId: conversation.id,
          role: "ai_reply",
          content,
          generatedMessageId,
          createdAt: now,
        });

        await tx
          .update(conversations)
          .set({ updatedAt: now })
          .where(
            and(eq(conversations.id, conversation.id), eq(conversations.userId, ctx.user.id)),
          );
      });

      return {
        id,
        role: "follow-up" as const,
        content,
        timestamp: now.toISOString(),
        isFavourite: false,
      };
    }),

  saveReplyAndGenerateFollowUp: protectedProcedure
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
        throw notFound("Conversation was not found.");
      }

      const [[offering], [prospect], thread] = await Promise.all([
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
        db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id))
          .orderBy(asc(conversationMessages.createdAt)),
      ]);

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      // Try to load custom prompt, otherwise fall back to default
      let prompt = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.userId, ctx.user.id),
            eq(prompts.offeringId, conversation.offeringId),
            eq(prompts.prospectId, conversation.prospectId),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (!prompt) {
        prompt = await getDefaultPromptForUser(ctx.user.id);
      }

      const replyId = crypto.randomUUID();
      const replyNow = new Date();

      const replyMsgObj = {
        id: replyId,
        userId: ctx.user.id,
        conversationId: conversation.id,
        role: "prospect_reply",
        content: input.content,
        generatedMessageId: null,
        rating: null,
        isFavorite: false,
        createdAt: replyNow,
      };

      const threadForPrompt = [...thread, replyMsgObj];

      const followUpContent = await completeWithOpenRouter([
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
            promptPreferences(prompt)
              ? `Prompt preferences:\n${promptPreferences(prompt)}`
              : "Prompt preferences: use the saved system prompt.",
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

      const followUpId = crypto.randomUUID();
      const generatedMessageId = crypto.randomUUID();
      const followUpNow = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(conversationMessages).values({
          id: replyId,
          userId: ctx.user.id,
          conversationId: conversation.id,
          role: "prospect_reply",
          content: input.content,
          createdAt: replyNow,
        });

        await tx.insert(generatedMessages).values({
          id: generatedMessageId,
          userId: ctx.user.id,
          prospectId: prospect.id,
          offeringId: offering.id,
          promptId: prompt.id,
          content: followUpContent,
          tone: prompt.tone,
        });

        await tx.insert(conversationMessages).values({
          id: followUpId,
          userId: ctx.user.id,
          conversationId: conversation.id,
          role: "ai_reply",
          content: followUpContent,
          generatedMessageId,
          createdAt: followUpNow,
        });

        await tx
          .update(conversations)
          .set({ updatedAt: followUpNow })
          .where(
            and(eq(conversations.id, conversation.id), eq(conversations.userId, ctx.user.id)),
          );
      });

      return {
        reply: {
          id: replyId,
          role: "reply" as const,
          content: input.content,
          timestamp: replyNow.toISOString(),
        },
        followUp: {
          id: followUpId,
          role: "follow-up" as const,
          content: followUpContent,
          timestamp: followUpNow.toISOString(),
          isFavourite: false,
        },
      };
    }),

  toggleFavoriteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [msg] = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, input.messageId),
            eq(conversationMessages.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!msg) {
        throw notFound("Message not found.");
      }

      const nextVal = !msg.isFavorite;

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ isFavorite: nextVal })
          .where(
            and(
              eq(conversationMessages.id, input.messageId),
              eq(conversationMessages.userId, ctx.user.id),
            ),
          );

        if (msg.generatedMessageId) {
          await tx
            .update(generatedMessages)
            .set({ isFavorite: nextVal })
            .where(
              and(
                eq(generatedMessages.id, msg.generatedMessageId),
                eq(generatedMessages.userId, ctx.user.id),
              ),
            );
        }
      });

      return { id: input.messageId, isFavourite: nextVal };
    }),

  rateMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string().min(1),
        rating: z.number().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [msg] = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, input.messageId),
            eq(conversationMessages.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!msg) {
        throw notFound("Message not found.");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ rating: input.rating })
          .where(
            and(
              eq(conversationMessages.id, input.messageId),
              eq(conversationMessages.userId, ctx.user.id),
            ),
          );

        if (msg.generatedMessageId) {
          await tx
            .update(generatedMessages)
            .set({ rating: input.rating })
            .where(
              and(
                eq(generatedMessages.id, msg.generatedMessageId),
                eq(generatedMessages.userId, ctx.user.id),
              ),
            );
        }
      });

      return { id: input.messageId, rating: input.rating };
    }),

  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [msg] = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, input.messageId),
            eq(conversationMessages.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!msg) {
        throw notFound("Message not found.");
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(conversationMessages)
          .where(
            and(
              eq(conversationMessages.id, input.messageId),
              eq(conversationMessages.userId, ctx.user.id),
            ),
          );

        if (msg.generatedMessageId) {
          await tx
            .delete(generatedMessages)
            .where(
              and(
                eq(generatedMessages.id, msg.generatedMessageId),
                eq(generatedMessages.userId, ctx.user.id),
              ),
            );
        }
      });

      return { success: true };
    }),

  regenerateMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [msg] = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, input.messageId),
            eq(conversationMessages.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!msg) {
        throw notFound("Message not found.");
      }

      if (msg.role !== "outbound" && msg.role !== "ai_reply") {
        throw badRequest("Only AI-generated messages can be regenerated.");
      }

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, msg.conversationId),
            eq(conversations.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!conversation) {
        throw notFound("Conversation not found.");
      }

      const [[offering], [prospect]] = await Promise.all([
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
      ]);

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      // Try to load custom prompt first, fallback to default
      let prompt = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.userId, ctx.user.id),
            eq(prompts.offeringId, conversation.offeringId),
            eq(prompts.prospectId, conversation.prospectId),
          ),
        )
        .limit(1)
        .then((res) => res[0]);

      if (!prompt) {
        prompt = await getDefaultPromptForUser(ctx.user.id);
      }

      let content = "";
      if (msg.role === "outbound") {
        content = await completeWithOpenRouter([
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
              promptPreferences(prompt)
                ? `Prompt preferences:\n${promptPreferences(prompt)}`
                : "Prompt preferences: use the saved system prompt.",
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
      } else {
        // AI follow-up regeneration: load the thread BEFORE this message
        const prevMessages = await db
          .select()
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.conversationId, conversation.id),
              lt(conversationMessages.createdAt, msg.createdAt),
            ),
          )
          .orderBy(asc(conversationMessages.createdAt));

        content = await completeWithOpenRouter([
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
              promptPreferences(prompt)
                ? `Prompt preferences:\n${promptPreferences(prompt)}`
                : "Prompt preferences: use the saved system prompt.",
              "",
              "Prospect:",
              `Name: ${prospect.name}`,
              `Role: ${prospect.role ?? "not specified"}`,
              `Company: ${prospect.company ?? "not specified"}`,
              `Context: ${prospect.aiProfileSummary || prospect.manualContext || "not provided"}`,
              "",
              "Conversation so far:",
              ...prevMessages.map(
                (message) =>
                  `${message.role === "prospect_reply" ? "Prospect" : "You"}: ${message.content}`,
              ),
              "",
              "Return only the follow-up reply text.",
            ].join("\n"),
          },
        ]);
      }

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ content })
          .where(
            and(
              eq(conversationMessages.id, input.messageId),
              eq(conversationMessages.userId, ctx.user.id),
            ),
          );

        if (msg.generatedMessageId) {
          await tx
            .update(generatedMessages)
            .set({ content })
            .where(
              and(
                eq(generatedMessages.id, msg.generatedMessageId),
                eq(generatedMessages.userId, ctx.user.id),
              ),
            );
        }
      });

      return {
        id: msg.id,
        role:
          msg.role === "ai_reply"
            ? ("follow-up" as const)
            : ("outbound" as const),
        content,
        timestamp: msg.createdAt.toISOString(),
        rating: msg.rating ?? undefined,
        isFavourite: msg.isFavorite,
      };
    }),
});
