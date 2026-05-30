import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

export const offerings = pgTable(
  "offerings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    websiteUrl: text("website_url"),
    rawWebsiteContent: text("raw_website_content"),
    manualContext: text("manual_context").notNull().default(""),
    aiSummary: text("ai_summary"),
    positioning: text("positioning"),
    targetCustomers: text("target_customers"),
    painPoints: jsonb("pain_points").$type<string[]>().notNull().default([]),
    proofPoints: jsonb("proof_points").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [index("offerings_user_id_idx").on(table.userId)],
);

export const prompts = pgTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    tone: text("tone"),
    lengthPreference: text("length_preference"),
    avoidList: jsonb("avoid_list").$type<string[]>().notNull().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("prompts_user_id_idx").on(table.userId),
    uniqueIndex("prompts_user_default_unique")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
);

export const prospects = pgTable(
  "prospects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    company: text("company"),
    manualContext: text("manual_context"),
    aiProfileSummary: text("ai_profile_summary"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [index("prospects_user_id_idx").on(table.userId)],
);

export const prospectSources = pgTable(
  "prospect_sources",
  {
    id: text("id").primaryKey(),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    url: text("url"),
    fileUrl: text("file_url"),
    rawContent: text("raw_content"),
    extractedSummary: text("extracted_summary"),
    status: text("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [index("prospect_sources_prospect_id_idx").on(table.prospectId)],
);

export const generatedMessages = pgTable(
  "generated_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    offeringId: text("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    promptId: text("prompt_id").references(() => prompts.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    angle: text("angle"),
    tone: text("tone"),
    rating: integer("rating"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("generated_messages_user_id_idx").on(table.userId),
    index("generated_messages_prospect_id_idx").on(table.prospectId),
    index("generated_messages_offering_id_idx").on(table.offeringId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    offeringId: text("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    generatedMessageId: text("generated_message_id").references(
      () => generatedMessages.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),
    index("conversations_prospect_id_idx").on(table.prospectId),
  ],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    generatedMessageId: text("generated_message_id").references(
      () => generatedMessages.id,
      { onDelete: "set null" },
    ),
    rating: integer("rating"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("conversation_messages_user_id_idx").on(table.userId),
    index("conversation_messages_conversation_id_idx").on(table.conversationId),
  ],
);

export const offeringRelations = relations(offerings, ({ many, one }) => ({
  user: one(user, { fields: [offerings.userId], references: [user.id] }),
  generatedMessages: many(generatedMessages),
  conversations: many(conversations),
}));

export const promptRelations = relations(prompts, ({ one }) => ({
  user: one(user, { fields: [prompts.userId], references: [user.id] }),
}));

export const prospectRelations = relations(prospects, ({ many, one }) => ({
  user: one(user, { fields: [prospects.userId], references: [user.id] }),
  sources: many(prospectSources),
  generatedMessages: many(generatedMessages),
  conversations: many(conversations),
}));

export const prospectSourceRelations = relations(prospectSources, ({ one }) => ({
  prospect: one(prospects, {
    fields: [prospectSources.prospectId],
    references: [prospects.id],
  }),
}));

export const generatedMessageRelations = relations(
  generatedMessages,
  ({ one }) => ({
    user: one(user, {
      fields: [generatedMessages.userId],
      references: [user.id],
    }),
    prospect: one(prospects, {
      fields: [generatedMessages.prospectId],
      references: [prospects.id],
    }),
    offering: one(offerings, {
      fields: [generatedMessages.offeringId],
      references: [offerings.id],
    }),
  }),
);

export const conversationRelations = relations(
  conversations,
  ({ many, one }) => ({
    user: one(user, { fields: [conversations.userId], references: [user.id] }),
    prospect: one(prospects, {
      fields: [conversations.prospectId],
      references: [prospects.id],
    }),
    offering: one(offerings, {
      fields: [conversations.offeringId],
      references: [offerings.id],
    }),
    messages: many(conversationMessages),
  }),
);

export const conversationMessageRelations = relations(
  conversationMessages,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMessages.conversationId],
      references: [conversations.id],
    }),
  }),
);
