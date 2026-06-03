/*
 * Mobile dashboard top bar.
 * Provides a menu trigger that opens the navigation drawer on small screens
 * where the fixed sidebar is hidden.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNavContent } from "@/components/layout/sidebar-nav";

type MobileDashboardHeaderProps = {
  user: {
    name: string;
    email: string;
  };
};

export function MobileDashboardHeader({ user }: MobileDashboardHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            O
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Outreach
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNavContent user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
