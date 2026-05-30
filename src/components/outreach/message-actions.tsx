"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Star, Heart, RefreshCcw, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

type MessageActionsProps = {
  messageId: string;
  role: "outbound" | "reply" | "follow-up";
  content: string;
  rating?: number;
  isFavourite?: boolean;
};

export function MessageActions({
  messageId,
  role,
  content,
  rating,
  isFavourite,
}: MessageActionsProps) {
  const utils = trpc.useUtils();

  const toggleFavorite = trpc.outreach.toggleFavoriteMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success(isFavourite ? "Removed from favourites." : "Added to favourites.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not update favourite status",
        description: error.message,
      });
    },
  });

  const rateMessage = trpc.outreach.rateMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success("Rating updated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save rating",
        description: error.message,
      });
    },
  });

  const deleteMessage = trpc.outreach.deleteMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      toast.success("Message deleted.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not delete message",
        description: error.message,
      });
    },
  });

  const regenerateMessage = trpc.outreach.regenerateMessage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success("Message regenerated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not regenerate message",
        description: error.message,
      });
    },
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  function handleToggleFavorite() {
    toggleFavorite.mutate({ messageId });
  }

  function handleRate(star: number) {
    rateMessage.mutate({ messageId, rating: star });
  }

  function handleDelete() {
    deleteMessage.mutate({ messageId });
  }

  function handleRegenerate() {
    regenerateMessage.mutate({ messageId });
  }

  const isBusy =
    toggleFavorite.isPending ||
    rateMessage.isPending ||
    deleteMessage.isPending ||
    regenerateMessage.isPending;

  return (
    <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              disabled={isBusy}
            />
          }
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleFavorite}
              disabled={isBusy}
            />
          }
        >
          {toggleFavorite.isPending ? (
            <Spinner className="h-3 w-3" />
          ) : (
            <Heart
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground",
                isFavourite && "fill-red-500 text-red-500"
              )}
            />
          )}
        </TooltipTrigger>
        <TooltipContent>Favourite</TooltipContent>
      </Tooltip>

      {role !== "reply" && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRegenerate}
                disabled={isBusy}
              />
            }
          >
            {regenerateMessage.isPending ? (
              <Spinner className="h-3 w-3" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      )}

      <div className="flex items-center gap-0.5 mx-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            disabled={isBusy}
          >
            <Star
              className={cn(
                "h-3 w-3",
                rating && star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/60"
              )}
            />
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isBusy}
            />
          }
        >
          {deleteMessage.isPending ? (
            <Spinner className="h-3 w-3" />
          ) : (
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive text-xs"
            onClick={handleDelete}
            disabled={isBusy}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
