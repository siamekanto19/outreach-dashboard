/*
 * Single conversation message bubble.
 * Applies sender-specific styling and exposes message actions for AI-generated
 * outbound and follow-up messages.
 */
"use client";

import { ConversationMessage } from "@/types/outreach";
import { MessageActions } from "./message-actions";

type MessageCardProps = {
  message: ConversationMessage;
};

export function MessageCard({ message }: MessageCardProps) {
  const isProspect = message.role === "reply";

  // Bubble colors: Blue for AI Outbound, Green for AI Follow-up, neutral Gray for Prospect
  const bubbleStyles = isProspect
    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-none border border-zinc-200/50 dark:border-zinc-700/50"
    : message.role === "follow-up"
      ? "bg-emerald-500/10 text-emerald-950 dark:text-emerald-300 border border-emerald-500/20 rounded-2xl rounded-tl-none"
      : "bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/20 rounded-2xl rounded-tl-none";

  return (
    <div className={`flex flex-col ${isProspect ? "items-end" : "items-start"} w-full space-y-0.5`}>
      {/* Time and sender label */}
      <span className="text-[9px] text-muted-foreground/60 font-semibold px-1 tracking-wide uppercase">
        {isProspect
          ? "Prospect"
          : message.role === "follow-up"
            ? "AI Follow-up"
            : "AI Outbound"}{" "}
        •{" "}
        {new Date(message.timestamp).toLocaleString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>

      {/* Bubble container - extremely compact text-xs and px-2.5 py-1.5 padding */}
      <div className={`max-w-[80%] px-2.5 py-1.5 shadow-sm text-xs leading-relaxed ${bubbleStyles}`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Message Actions - render for all AI-generated messages (outbound & follow-up) */}
      {message.role !== "reply" && (
        <div className="px-0.5">
          <MessageActions
            messageId={message.id}
            role={message.role}
            content={message.content}
            rating={message.rating}
            isFavourite={message.isFavourite}
          />
        </div>
      )}
    </div>
  );
}
