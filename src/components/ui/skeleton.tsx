/*
 * Skeleton loading primitive.
 * Provides a simple animated placeholder block for page and component loading
 * states throughout the dashboard.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}
