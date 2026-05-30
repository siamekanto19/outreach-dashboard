/*
 * Reply capture and follow-up composer.
 * Lets the user paste a prospect reply, optimistically adds it to the thread,
 * and asks the backend to save the reply plus generate a contextual response.
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
  onMessageRemoved: (messageId: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
};

export function ReplyComposer({
  conversationId,
  hasConversation,
  onMessageSaved,
  onMessageRemoved,
  onTypingChange,
}: ReplyComposerProps) {
  const utils = trpc.useUtils();
  const optimisticReplyRef = useRef<ConversationMessage | null>(null);
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      reply: "",
    },
  });

  const saveReplyAndFollowUp = trpc.outreach.saveReplyAndGenerateFollowUp.useMutation({
    onSuccess: async (data) => {
      // Append the real reply and follow-up (the real reply will filter out the optimistic one)
      onMessageSaved(data.reply);
      onMessageSaved(data.followUp);
      optimisticReplyRef.current = null;
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate(),
        utils.dashboard.analytics.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
    },
    onError: (error) => {
      if (optimisticReplyRef.current) {
        onMessageRemoved(optimisticReplyRef.current.id);
        form.reset({ reply: optimisticReplyRef.current.content });
        optimisticReplyRef.current = null;
      }
      toast.error({
        title: "Could not save reply",
        description: error.message,
      });
    },
  });

  const isBusy = saveReplyAndFollowUp.isPending;

  useEffect(() => {
    onTypingChange?.(isBusy);
  }, [isBusy, onTypingChange]);

  function handleSave(values: ReplyFormValues) {
    const contentToSubmit = values.reply;

    // 1. Optimistically append the prospect reply to the UI instantly
    const optimisticReply: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      role: "reply" as const,
      content: contentToSubmit,
      timestamp: new Date().toISOString(),
    };
    optimisticReplyRef.current = optimisticReply;
    onMessageSaved(optimisticReply);

    // 2. Instantly reset the input text area so it feels fast and responsive like real chat
    form.reset({ reply: "" });

    // 3. Dispatch the unified backend mutation
    saveReplyAndFollowUp.mutate({
      conversationId,
      content: contentToSubmit,
    });
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Paste prospect reply
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save the reply and automatically generate a contextual AI follow-up response in one step.
            </p>
          </div>
          
          {/* Bulletproof controlled input using Controller to guarantee 100% form sync in React 19 */}
          <Controller
            name="reply"
            control={form.control}
            render={({ field }) => (
              <textarea
                placeholder="Paste the prospect's reply here..."
                rows={4}
                className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                disabled={!hasConversation || isBusy}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={Boolean(form.formState.errors.reply)}
              />
            )}
          />
          
          {form.formState.errors.reply && (
            <p className="text-xs text-destructive">
              {form.formState.errors.reply.message}
            </p>
          )}
          {!hasConversation && (
            <p className="text-xs text-muted-foreground">
              Generate an outbound message first, then replies can be saved and answered here.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-full"
              disabled={!hasConversation || isBusy}
            >
              {isBusy ? (
                <Spinner className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isBusy ? "Generating Follow-up..." : "Save Reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
