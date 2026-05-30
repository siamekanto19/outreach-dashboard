"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Spinner />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <SidebarNav user={session.data.user} />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
