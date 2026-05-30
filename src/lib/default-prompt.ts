export const DEFAULT_SYSTEM_PROMPT =
  "Write a conversational outreach message under 100 words. Lead with one specific, relevant observation about the prospect before mentioning the offering. Keep it human, direct, and non-salesy. Avoid hype, generic compliments, and hard asks. End with a soft question.";

export const DEFAULT_PROMPT_VALUES = {
  name: "Default outreach prompt",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  tone: "Conversational",
  lengthPreference: "Under 100 words",
  avoidList: "generic compliments\nsalesy language\nhard asks",
};
