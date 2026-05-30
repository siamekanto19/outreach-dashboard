"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { OutreachWorkspace } from "@/components/outreach/outreach-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function OutreachPage() {
  const offerings = trpc.offerings.list.useQuery();
  const prospects = trpc.prospects.list.useQuery();
  const conversation = trpc.dashboard.latestConversation.useQuery();
  const isLoading =
    offerings.isLoading || prospects.isLoading || conversation.isLoading;
  const error = offerings.error ?? prospects.error ?? conversation.error;

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Outreach"
        description="Generate personalized messages and manage conversations."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Skeleton className="h-[520px] lg:col-span-2" />
          <Skeleton className="h-[520px] lg:col-span-3" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load outreach workspace: {error.message}
        </div>
      ) : (
        <OutreachWorkspace
          offerings={offerings.data ?? []}
          prospects={prospects.data ?? []}
          conversation={
            conversation.data ?? {
              id: "empty",
              offeringId: "",
              prospectId: "",
              messages: [],
              createdAt: new Date().toISOString(),
            }
          }
        />
      )}
    </div>
  );
}
