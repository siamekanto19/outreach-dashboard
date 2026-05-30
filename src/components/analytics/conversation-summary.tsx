import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

type ConversationSummaryProps = {
  conversations: {
    id: string;
    prospectName: string;
    offeringName: string;
    messages: number;
  }[];
};

export function ConversationSummary({
  conversations,
}: ConversationSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Conversations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conversations.length ? (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {conversation.prospectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversation.offeringName}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {conversation.messages} message
                {conversation.messages === 1 ? "" : "s"}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Conversations will appear after replies are saved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
