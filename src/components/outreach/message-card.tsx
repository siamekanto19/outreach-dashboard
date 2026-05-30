import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversationMessage } from "@/types/outreach";
import { MessageActions } from "./message-actions";

type MessageCardProps = {
  message: ConversationMessage;
};

export function MessageCard({ message }: MessageCardProps) {
  const roleLabels: Record<ConversationMessage["role"], string> = {
    outbound: "You",
    reply: "Prospect",
    "follow-up": "Follow-up",
  };

  const roleStyles: Record<ConversationMessage["role"], string> = {
    outbound: "border-l-zinc-900",
    reply: "border-l-blue-500",
    "follow-up": "border-l-emerald-500",
  };

  return (
    <Card className={`border-l-4 ${roleStyles[message.role]}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={message.role === "reply" ? "outline" : "secondary"}
                className="text-xs"
              >
                {roleLabels[message.role]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(message.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
        {message.role !== "reply" && (
          <div className="mt-3 pt-3 border-t border-border">
            <MessageActions
              rating={message.rating}
              isFavourite={message.isFavourite}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
