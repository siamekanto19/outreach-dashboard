/*
 * Client-side authenticated dashboard shell.
 * Verifies the Better Auth session in the browser, redirects anonymous users,
 * and renders the sidebar around protected dashboard content.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileDashboardHeader } from "@/components/layout/mobile-dashboard-header";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const session = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !session.isPending && !session.data) {
      router.replace("/signin");
    }
  }, [mounted, router, session.data, session.isPending]);

  if (!mounted || session.isPending || !session.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <SidebarNav user={session.data.user} />
      <MobileDashboardHeader user={session.data.user} />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
