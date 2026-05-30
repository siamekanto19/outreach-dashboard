/*
 * OpenRouter integration for all server-side AI calls.
 * Wraps chat completions, optional JSON responses, and image-aware prompts so
 * routers can generate outreach copy and extract structured context safely.
 */
type TextContent = {
  type: "text";
  text: string;
};

type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type ContentPart = TextContent | ImageContent;

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

type OpenRouterResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

type CompleteOptions = {
  jsonOutput?: boolean;
};

export async function completeWithOpenRouter(
  messages: OpenRouterMessage[],
  options?: CompleteOptions,
) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
    messages,
    temperature: 0.4,
  };

  if (options?.jsonOutput) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      "X-Title": "Outreach Dashboard",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `OpenRouter request failed with status ${response.status}.`,
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return content;
}

export async function completeWithImage(
  systemPrompt: string,
  textPrompt: string,
  imageBase64: string,
  options?: CompleteOptions,
) {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: textPrompt },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    },
  ];

  return completeWithOpenRouter(messages, options);
}
