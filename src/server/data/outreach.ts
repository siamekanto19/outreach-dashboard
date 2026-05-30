/*
 * Outreach conversation query helpers.
 * Fetches the latest conversation and compact conversation summaries used by
 * the outreach workspace and analytics dashboard.
 */
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  conversationMessages,
  conversations,
  offerings,
  prospects,
} from "@/db/schema";
import { Conversation } from "@/types/outreach";
import { emptyConversation } from "./mappers";

export async function getLatestConversationForUser(
  userId: string,
): Promise<Conversation> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  if (!conversation) {
    return emptyConversation();
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
          ? "reply"
          : message.role === "ai_reply"
            ? "follow-up"
            : "outbound",
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      rating: message.rating ?? undefined,
      isFavourite: message.isFavorite,
    })),
  };
}

export async function getConversationSummariesForUser(userId: string) {
  return db
    .select({
      id: conversations.id,
      prospectName: prospects.name,
      offeringName: offerings.name,
      messageCount: db.$count(
        conversationMessages,
        eq(conversationMessages.conversationId, conversations.id),
      ),
    })
    .from(conversations)
    .innerJoin(prospects, eq(prospects.id, conversations.prospectId))
    .innerJoin(offerings, eq(offerings.id, conversations.offeringId))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(3);
}
