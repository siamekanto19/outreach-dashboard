/*
 * Outreach tRPC router.
 * Owns message generation, conversation retrieval, reply handling, follow-up
 * generation, ratings, favorites, deletion, and regeneration for saved threads.
 */
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
import { mapConversation, mapConversationMessage } from "@/server/data/mappers";
import { getDefaultPromptForUser } from "@/server/data/prompts";
import { protectedProcedure, router } from "@/server/trpc";

type PromptRow = typeof prompts.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;
type ConversationMessageRow = typeof conversationMessages.$inferSelect;
type OfferingRow = typeof offerings.$inferSelect;
type ProspectRow = typeof prospects.$inferSelect;

const FOLLOW_UP_SYSTEM_INSTRUCTIONS =
  "You are now writing a follow-up reply in an existing conversation. Do not restart the cold outreach. Answer the prospect's latest question directly, preserve the same tone, and keep the conversation moving with one soft next step.";

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

function promptPreferenceBlock(prompt: PromptRow) {
  const preferences = promptPreferences(prompt);

  return preferences
    ? `Prompt preferences:\n${preferences}`
    : "Prompt preferences: use the saved system prompt.";
}

function userConversationWhere(userId: string, conversationId: string) {
  return and(
    eq(conversations.id, conversationId),
    eq(conversations.userId, userId),
  );
}

function userMessageWhere(userId: string, messageId: string) {
  return and(
    eq(conversationMessages.id, messageId),
    eq(conversationMessages.userId, userId),
  );
}

async function getConversationForUser(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(userConversationWhere(userId, conversationId))
    .limit(1);

  return conversation;
}

async function getMessageForUser(userId: string, messageId: string) {
  const [message] = await db
    .select()
    .from(conversationMessages)
    .where(userMessageWhere(userId, messageId))
    .limit(1);

  return message;
}

function getConversationMessages(conversationId: string) {
  return db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(asc(conversationMessages.createdAt));
}

async function getPromptForContext(
  userId: string,
  offeringId: string,
  prospectId: string,
) {
  const [customPrompt] = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.userId, userId),
        eq(prompts.offeringId, offeringId),
        eq(prompts.prospectId, prospectId),
      ),
    )
    .limit(1);

  return customPrompt ?? getDefaultPromptForUser(userId);
}

async function getOfferingAndProspectForUser(
  userId: string,
  offeringId: string,
  prospectId: string,
) {
  const [[offering], [prospect]] = await Promise.all([
    db
      .select()
      .from(offerings)
      .where(and(eq(offerings.id, offeringId), eq(offerings.userId, userId)))
      .limit(1),
    db
      .select()
      .from(prospects)
      .where(and(eq(prospects.id, prospectId), eq(prospects.userId, userId)))
      .limit(1),
  ]);

  return { offering, prospect };
}

async function getConversationContext(userId: string, conversation: ConversationRow) {
  const [{ offering, prospect }, thread] = await Promise.all([
    getOfferingAndProspectForUser(
      userId,
      conversation.offeringId,
      conversation.prospectId,
    ),
    getConversationMessages(conversation.id),
  ]);

  return { offering, prospect, thread };
}

function buildOutboundPrompt(
  offering: OfferingRow,
  prospect: ProspectRow,
  prompt: PromptRow,
) {
  return [
    {
      role: "system" as const,
      content: prompt.systemPrompt,
    },
    {
      role: "user" as const,
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
        promptPreferenceBlock(prompt),
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
  ];
}

function buildFollowUpPrompt(
  offering: OfferingRow,
  prospect: ProspectRow,
  prompt: PromptRow,
  thread: ConversationMessageRow[],
) {
  return [
    {
      role: "system" as const,
      content: [prompt.systemPrompt, "", FOLLOW_UP_SYSTEM_INSTRUCTIONS].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        "Generate one natural follow-up reply.",
        "",
        "Offering:",
        `Name: ${offering.name}`,
        `Context: ${offering.aiSummary || offering.manualContext}`,
        `Positioning: ${offering.positioning ?? "not provided"}`,
        promptPreferenceBlock(prompt),
        "",
        "Prospect:",
        `Name: ${prospect.name}`,
        `Role: ${prospect.role ?? "not specified"}`,
        `Company: ${prospect.company ?? "not specified"}`,
        `Context: ${prospect.aiProfileSummary || prospect.manualContext || "not provided"}`,
        "",
        "Conversation so far:",
        ...thread.map(
          (message) =>
            `${message.role === "prospect_reply" ? "Prospect" : "You"}: ${message.content}`,
        ),
        "",
        "Return only the follow-up reply text.",
      ].join("\n"),
    },
  ];
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

      const messages = await getConversationMessages(conversation.id);

      return mapConversation(conversation, messages);
    }),

  generateMessage: protectedProcedure
    .input(
      z.object({
        offeringId: z.string().min(1, "Select an offering."),
        prospectId: z.string().min(1, "Select a prospect."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { offering, prospect } = await getOfferingAndProspectForUser(
        ctx.user.id,
        input.offeringId,
        input.prospectId,
      );

      if (!offering || !prospect) {
        throw notFound("Selected offering or prospect was not found.");
      }

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

      const prompt = await getPromptForContext(
        ctx.user.id,
        input.offeringId,
        input.prospectId,
      );
      const content = await completeWithOpenRouter(
        buildOutboundPrompt(offering, prospect, prompt),
      );

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
      const allMessages = await getConversationMessages(conversationId);

      return mapConversation(
        {
          id: conversationId,
          offeringId: offering.id,
          prospectId: prospect.id,
          createdAt: existingConversation?.createdAt || now,
        },
        allMessages,
      );
    }),

  saveReply: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, "Generate a message first."),
        content: z.string().trim().min(1, "Paste a reply first."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationForUser(
        ctx.user.id,
        input.conversationId,
      );

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
        .where(userConversationWhere(ctx.user.id, conversation.id));

      return mapConversationMessage({
        id,
        role: "prospect_reply",
        content: input.content,
        createdAt: now,
        rating: null,
        isFavorite: false,
      });
    }),

  generateFollowUp: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, "Generate a message first."),
        latestReply: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationForUser(
        ctx.user.id,
        input.conversationId,
      );

      if (!conversation) {
        throw notFound("Conversation was not found.");
      }

      const { offering, prospect, thread } = await getConversationContext(
        ctx.user.id,
        conversation,
      );

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      const prompt = await getPromptForContext(
        ctx.user.id,
        conversation.offeringId,
        conversation.prospectId,
      );

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

      const content = await completeWithOpenRouter(
        buildFollowUpPrompt(offering, prospect, prompt, threadForPrompt),
      );

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
          .where(userConversationWhere(ctx.user.id, conversation.id));
      });

      return mapConversationMessage({
        id,
        role: "ai_reply",
        content,
        createdAt: now,
        rating: null,
        isFavorite: false,
      });
    }),

  saveReplyAndGenerateFollowUp: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, "Generate a message first."),
        content: z.string().trim().min(1, "Paste a reply first."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationForUser(
        ctx.user.id,
        input.conversationId,
      );

      if (!conversation) {
        throw notFound("Conversation was not found.");
      }

      const { offering, prospect, thread } = await getConversationContext(
        ctx.user.id,
        conversation,
      );

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      const prompt = await getPromptForContext(
        ctx.user.id,
        conversation.offeringId,
        conversation.prospectId,
      );

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

      const followUpContent = await completeWithOpenRouter(
        buildFollowUpPrompt(offering, prospect, prompt, threadForPrompt),
      );

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
          .where(userConversationWhere(ctx.user.id, conversation.id));
      });

      return {
        reply: mapConversationMessage({
          id: replyId,
          role: "prospect_reply",
          content: input.content,
          createdAt: replyNow,
          rating: null,
          isFavorite: false,
        }),
        followUp: mapConversationMessage({
          id: followUpId,
          role: "ai_reply",
          content: followUpContent,
          createdAt: followUpNow,
          rating: null,
          isFavorite: false,
        }),
      };
    }),

  toggleFavoriteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const msg = await getMessageForUser(ctx.user.id, input.messageId);

      if (!msg) {
        throw notFound("Message not found.");
      }

      const nextVal = !msg.isFavorite;

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ isFavorite: nextVal })
          .where(userMessageWhere(ctx.user.id, input.messageId));

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
      const msg = await getMessageForUser(ctx.user.id, input.messageId);

      if (!msg) {
        throw notFound("Message not found.");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ rating: input.rating })
          .where(userMessageWhere(ctx.user.id, input.messageId));

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
      const msg = await getMessageForUser(ctx.user.id, input.messageId);

      if (!msg) {
        throw notFound("Message not found.");
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(conversationMessages)
          .where(userMessageWhere(ctx.user.id, input.messageId));

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
      const msg = await getMessageForUser(ctx.user.id, input.messageId);

      if (!msg) {
        throw notFound("Message not found.");
      }

      if (msg.role !== "outbound" && msg.role !== "ai_reply") {
        throw badRequest("Only AI-generated messages can be regenerated.");
      }

      const conversation = await getConversationForUser(
        ctx.user.id,
        msg.conversationId,
      );

      if (!conversation) {
        throw notFound("Conversation not found.");
      }

      const { offering, prospect } = await getOfferingAndProspectForUser(
        ctx.user.id,
        conversation.offeringId,
        conversation.prospectId,
      );

      if (!offering || !prospect) {
        throw notFound("Conversation context is incomplete.");
      }

      const prompt = await getPromptForContext(
        ctx.user.id,
        conversation.offeringId,
        conversation.prospectId,
      );

      let content = "";
      if (msg.role === "outbound") {
        content = await completeWithOpenRouter(
          buildOutboundPrompt(offering, prospect, prompt),
        );
      } else {
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

        content = await completeWithOpenRouter(
          buildFollowUpPrompt(offering, prospect, prompt, prevMessages),
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .update(conversationMessages)
          .set({ content })
          .where(userMessageWhere(ctx.user.id, input.messageId));

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

      return mapConversationMessage({ ...msg, content });
    }),
});
