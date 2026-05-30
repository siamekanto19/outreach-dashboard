export type ConversationMessage = {
  id: string;
  role: "outbound" | "reply" | "follow-up";
  content: string;
  timestamp: string;
  rating?: number;
  isFavourite?: boolean;
};

export type Conversation = {
  id: string;
  offeringId: string;
  prospectId: string;
  messages: ConversationMessage[];
  createdAt: string;
};
