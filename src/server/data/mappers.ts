/*
 * Database-to-UI mapping utilities.
 * Converts raw Drizzle rows into the stable client-facing shapes used by
 * offerings, prospects, and empty conversation states.
 */
import { Conversation, ConversationMessage } from "@/types/outreach";
import { Offering } from "@/types/offering";
import { Prospect } from "@/types/prospect";
import { formatDate } from "@/server/format";

type OfferingRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  manualContext: string;
  aiSummary: string | null;
  positioning: string | null;
  targetCustomers: string | null;
  proofPoints: string[];
  updatedAt: Date;
  createdAt: Date;
};

type ProspectRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  tags: string[];
  manualContext?: string | null;
  aiProfileSummary?: string | null;
  createdAt: Date;
  sourceTypes?: string[];
};

type ConversationRow = {
  id: string;
  offeringId: string;
  prospectId: string;
  createdAt: Date;
};

type ConversationMessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  rating: number | null;
  isFavorite: boolean;
};

export function mapOffering(row: OfferingRow): Offering {
  return {
    id: row.id,
    name: row.name,
    url: row.websiteUrl ?? "",
    context: row.aiSummary || row.manualContext || "No context added yet.",
    targetAudience: row.targetCustomers || "Not specified",
    proofPoints: row.proofPoints,
    positioningNotes: row.positioning || "No positioning notes yet.",
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  };
}

export function mapProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    name: row.name,
    company: row.company || "Not specified",
    role: row.role || "Not specified",
    sources: row.sourceTypes?.length ? row.sourceTypes : ["Manual"],
    tags: row.tags,
    manualContext: row.manualContext || "",
    aiProfileSummary: row.aiProfileSummary || "",
    createdAt: formatDate(row.createdAt),
  };
}

export function mapConversationMessage(
  message: ConversationMessageRow,
): ConversationMessage {
  return {
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
  };
}

export function mapConversation(
  conversation: ConversationRow,
  messages: ConversationMessageRow[],
): Conversation {
  return {
    id: conversation.id,
    offeringId: conversation.offeringId,
    prospectId: conversation.prospectId,
    createdAt: conversation.createdAt.toISOString(),
    messages: messages.map(mapConversationMessage),
  };
}

export function emptyConversation(): Conversation {
  return {
    id: "empty",
    offeringId: "",
    prospectId: "",
    messages: [],
    createdAt: formatDate(new Date()),
  };
}
