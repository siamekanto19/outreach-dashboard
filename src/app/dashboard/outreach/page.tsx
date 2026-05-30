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
