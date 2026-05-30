"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ConversationMessage } from "@/types/outreach";

const replySchema = z.object({
  reply: z.string().trim().min(1, "Paste the prospect's reply first."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

type ReplyComposerProps = {
  conversationId: string;
  hasConversation: boolean;
  onMessageSaved: (message: ConversationMessage) => void;
};

export function ReplyComposer({
  conversationId,
  hasConversation,
  onMessageSaved,
}: ReplyComposerProps) {
  const utils = trpc.useUtils();
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      reply: "",
    },
  });

  const saveReply = trpc.outreach.saveReply.useMutation({
    onSuccess: async (message) => {
      onMessageSaved(message);
      form.reset();
      await Promise.all([
        utils.dashboard.analytics.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success("Reply saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save reply",
        description: error.message,
      });
    },
  });

  const generateFollowUp = trpc.outreach.generateFollowUp.useMutation({
    onSuccess: async (message) => {
      onMessageSaved(message);
      form.reset();
      await Promise.all([
        utils.dashboard.analytics.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success("Follow-up generated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not generate follow-up",
        description: error.message,
      });
    },
  });

  const isBusy = saveReply.isPending || generateFollowUp.isPending;

  function handleSave(values: ReplyFormValues) {
    saveReply.mutate({
      conversationId,
      content: values.reply,
    });
  }

  function handleGenerate(values: ReplyFormValues) {
    generateFollowUp.mutate({
      conversationId,
      latestReply: values.reply,
    });
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Paste prospect reply
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save the reply for history, or generate a contextual follow-up in
              one step.
            </p>
          </div>
          <Textarea
            placeholder="Paste the prospect's reply here..."
            rows={4}
            className="text-sm"
            aria-invalid={Boolean(form.formState.errors.reply)}
            disabled={!hasConversation || isBusy}
            {...form.register("reply")}
          />
          {form.formState.errors.reply && (
            <p className="text-xs text-destructive">
              {form.formState.errors.reply.message}
            </p>
          )}
          {!hasConversation && (
            <p className="text-xs text-muted-foreground">
              Generate an outbound message first, then replies can be saved and
              answered here.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!hasConversation || isBusy}
              onClick={form.handleSubmit(handleSave)}
            >
              {saveReply.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {saveReply.isPending ? "Saving..." : "Save Reply"}
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={!hasConversation || isBusy}
              onClick={form.handleSubmit(handleGenerate)}
            >
              {generateFollowUp.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {generateFollowUp.isPending
                ? "Generating..."
                : "Generate Follow-up"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
