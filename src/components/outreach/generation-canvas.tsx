"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConversationThread } from "./conversation-thread";
import { ReplyComposer } from "./reply-composer";
import { Conversation } from "@/types/outreach";
import { Offering } from "@/types/offering";
import { Prospect } from "@/types/prospect";
import { ConversationMessage } from "@/types/outreach";

type GenerationCanvasProps = {
  conversation: Conversation;
  offering: Offering;
  prospect: Prospect;
  onMessageSaved: (message: ConversationMessage) => void;
};

export function GenerationCanvas({
  conversation,
  offering,
  prospect,
  onMessageSaved,
}: GenerationCanvasProps) {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Conversation
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {offering.name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {prospect.name}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ConversationThread messages={conversation.messages} isTyping={isTyping} />
        </CardContent>
      </Card>

      <Separator />

      <ReplyComposer
        conversationId={conversation.id}
        hasConversation={conversation.id !== "draft" && conversation.id !== "empty"}
        onMessageSaved={onMessageSaved}
        onTypingChange={setIsTyping}
      />
    </div>
  );
}
