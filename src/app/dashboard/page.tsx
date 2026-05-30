"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MetricCard } from "@/components/analytics/metric-card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { OfferingUsageCard } from "@/components/analytics/offering-usage-card";
import { ConversationSummary } from "@/components/analytics/conversation-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const analytics = trpc.dashboard.analytics.useQuery();

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Analytics"
        description="A quick overview of outreach performance."
        action={<Button variant="outline">Export</Button>}
      />

      {analytics.isLoading ? (
        <DashboardSkeleton />
      ) : analytics.data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analytics.data.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityFeed items={analytics.data.activity} />
            </div>
            <div className="space-y-6">
              <OfferingUsageCard offerings={analytics.data.topOfferings} />
              <ConversationSummary conversations={analytics.data.conversations} />
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Could not load analytics.</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[420px] lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </>
  );
}
