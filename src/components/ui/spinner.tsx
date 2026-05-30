/*
 * Loading spinner primitive.
 * Renders the shared animated loader icon used inside pending buttons and
 * blocking states.
 */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}
