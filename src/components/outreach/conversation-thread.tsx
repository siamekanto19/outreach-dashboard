import { ConversationMessage } from "@/types/outreach";
import { MessageCard } from "./message-card";
import { ScrollArea } from "@/components/ui/scroll-area";

type ConversationThreadProps = {
  messages: ConversationMessage[];
};

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {messages.length ? (
          messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
            Choose an offering and prospect, then generate a message to preview
            the conversation here.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
