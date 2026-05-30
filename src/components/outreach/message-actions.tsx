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

type MessageActionsProps = {
  rating?: number;
  isFavourite?: boolean;
};

export function MessageActions({ rating, isFavourite }: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <Copy className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isFavourite && "fill-red-500 text-red-500"
            )}
          />
        </TooltipTrigger>
        <TooltipContent>Favourite</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <RefreshCcw className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-0.5 mx-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className="p-0.5 rounded hover:bg-zinc-100 transition-colors"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                rating && star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-300"
              )}
            />
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
