import { Conversation } from "@/types/outreach";

export const dummyConversation: Conversation = {
  id: "1",
  offeringId: "1",
  prospectId: "1",
  messages: [
    {
      id: "m1",
      role: "outbound",
      content:
        "Hey Sarah, saw your post about the outreach volume problem last week. Kakiyo helps teams run real LinkedIn conversations at scale without relying on rigid sequences or templates. It qualifies prospects and books meetings from the conversation itself. Curious if this is something your team is already exploring?",
      timestamp: "2024-03-10T10:30:00Z",
      rating: 4,
      isFavourite: true,
    },
    {
      id: "m2",
      role: "reply",
      content:
        "Interesting, how does it actually work? Does it need access to my LinkedIn account?",
      timestamp: "2024-03-10T14:15:00Z",
    },
    {
      id: "m3",
      role: "follow-up",
      content:
        "Good question. Kakiyo works by connecting to your outreach workflow and handling the conversation logic from first message to booked meeting. The goal is not to spam more people, but to make each conversation feel relevant and responsive. Access depends on the setup, but the product is designed around controlled, permission-based workflows.",
      timestamp: "2024-03-10T15:00:00Z",
      rating: 5,
      isFavourite: false,
    },
  ],
  createdAt: "2024-03-10",
};

export const defaultSystemPrompt =
  "Conversational tone, under 100 words, lead with relevant observation, never sound salesy, end with soft question.";
