/*
 * Analytics read model for the dashboard overview.
 * Aggregates user-scoped counts, recent activity, top offering usage, and
 * latest conversation summaries from the database.
 */
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conversationMessages,
  conversations,
  generatedMessages,
  offerings,
  prospects,
} from "@/db/schema";
import { ActivityItem, Metric, OfferingUsage } from "@/types/analytics";
import { formatRelativeTime } from "@/server/format";

export async function getAnalyticsForUser(userId: string) {
  const [
    messageCount,
    offeringCount,
    prospectCount,
    replyConversationCount,
    offeringUsage,
    latestProspects,
    latestMessages,
    latestConversations,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedMessages)
      .where(eq(generatedMessages.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(offerings)
      .where(eq(offerings.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(prospects)
      .where(eq(prospects.userId, userId)),
    db
      .select({
        count: sql<number>`count(distinct ${conversationMessages.conversationId})::int`,
      })
      .from(conversationMessages)
      .where(sql`${conversationMessages.userId} = ${userId} and ${conversationMessages.role} = 'reply'`),
    db
      .select({
        name: offerings.name,
        messagesGenerated: sql<number>`count(${generatedMessages.id})::int`,
      })
      .from(offerings)
      .leftJoin(
        generatedMessages,
        eq(generatedMessages.offeringId, offerings.id),
      )
      .where(eq(offerings.userId, userId))
      .groupBy(offerings.id)
      .orderBy(sql`count(${generatedMessages.id}) desc`)
      .limit(5),
    db
      .select({
        id: prospects.id,
        name: prospects.name,
        createdAt: prospects.createdAt,
      })
      .from(prospects)
      .where(eq(prospects.userId, userId))
      .orderBy(desc(prospects.createdAt))
      .limit(5),
    db
      .select({
        id: generatedMessages.id,
        prospectName: prospects.name,
        offeringName: offerings.name,
        createdAt: generatedMessages.createdAt,
      })
      .from(generatedMessages)
      .innerJoin(prospects, eq(prospects.id, generatedMessages.prospectId))
      .innerJoin(offerings, eq(offerings.id, generatedMessages.offeringId))
      .where(eq(generatedMessages.userId, userId))
      .orderBy(desc(generatedMessages.createdAt))
      .limit(5),
    db
      .select({
        id: conversations.id,
        prospectName: prospects.name,
        offeringName: offerings.name,
        createdAt: conversations.createdAt,
        messages: sql<number>`count(${conversationMessages.id})::int`,
      })
      .from(conversations)
      .innerJoin(prospects, eq(prospects.id, conversations.prospectId))
      .innerJoin(offerings, eq(offerings.id, conversations.offeringId))
      .leftJoin(
        conversationMessages,
        eq(conversationMessages.conversationId, conversations.id),
      )
      .where(eq(conversations.userId, userId))
      .groupBy(conversations.id, prospects.name, offerings.name)
      .orderBy(desc(conversations.createdAt))
      .limit(3),
  ]);

  const metrics: Metric[] = [
    {
      label: "Messages Generated",
      value: messageCount[0]?.count ?? 0,
      trend: "neutral",
    },
    {
      label: "Active Offerings",
      value: offeringCount[0]?.count ?? 0,
      trend: "neutral",
    },
    {
      label: "Prospects Saved",
      value: prospectCount[0]?.count ?? 0,
      trend: "neutral",
    },
    {
      label: "Reply Conversations",
      value: replyConversationCount[0]?.count ?? 0,
      trend: "neutral",
    },
  ];

  const totalGenerated = offeringUsage.reduce(
    (sum, offering) => sum + offering.messagesGenerated,
    0,
  );
  const topOfferings: OfferingUsage[] = offeringUsage.map((offering) => ({
    name: offering.name,
    messagesGenerated: offering.messagesGenerated,
    percentage: totalGenerated
      ? Math.round((offering.messagesGenerated / totalGenerated) * 100)
      : 0,
  }));

  const activity: ActivityItem[] = [
    ...latestMessages.map((message) => ({
      id: `message-${message.id}`,
      action: `Generated message for ${message.prospectName} using ${message.offeringName}`,
      timestamp: formatRelativeTime(message.createdAt),
      sortDate: message.createdAt,
    })),
    ...latestProspects.map((prospect) => ({
      id: `prospect-${prospect.id}`,
      action: `New prospect added: ${prospect.name}`,
      timestamp: formatRelativeTime(prospect.createdAt),
      sortDate: prospect.createdAt,
    })),
  ]
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    .slice(0, 7)
    .map(({ sortDate: _sortDate, ...item }) => item);

  return {
    metrics,
    activity,
    topOfferings,
    conversations: latestConversations,
  };
}
