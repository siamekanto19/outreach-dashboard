"use client";

import { useEffect, useRef } from "react";
import { ConversationMessage } from "@/types/outreach";
import { MessageCard } from "./message-card";

type ConversationThreadProps = {
  messages: ConversationMessage[];
  isTyping?: boolean;
};

export function TypingIndicator() {
  return (
    <div className="flex justify-start w-full">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none bg-emerald-500/20 border border-emerald-500/30 px-4 py-3 shadow-md">
        <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce" />
      </div>
    </div>
  );
}

export function ConversationThread({ messages, isTyping }: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={scrollRef}
      className="h-[420px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
    >
      {messages.length ? (
        messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Choose an offering and prospect, then generate a message to preview
          the conversation here.
        </div>
      )}

      {isTyping && <TypingIndicator />}
    </div>
  );
}
