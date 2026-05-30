"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MetricCard } from "@/components/analytics/metric-card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { OfferingUsageCard } from "@/components/analytics/offering-usage-card";
import { ConversationSummary } from "@/components/analytics/conversation-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Download } from "lucide-react";

export default function DashboardPage() {
  const analytics = trpc.dashboard.analytics.useQuery();

  function handleExport() {
    if (!analytics.data) {
      toast.error("Analytics are still loading.");
      return;
    }

    const rows = [
      ["Section", "Name", "Value"],
      ...analytics.data.metrics.map((metric) => [
        "Metric",
        metric.label,
        String(metric.value),
      ]),
      ...analytics.data.topOfferings.map((offering) => [
        "Offering usage",
        offering.name,
        `${offering.messagesGenerated} messages (${offering.percentage}%)`,
      ]),
      ...analytics.data.conversations.map((conversation) => [
        "Conversation",
        `${conversation.prospectName} / ${conversation.offeringName}`,
        `${conversation.messages} messages`,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `outreach-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics exported.");
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Analytics"
        description="A quick overview of outreach performance."
        action={
          <Button
            variant="outline"
            disabled={analytics.isLoading || !analytics.data}
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      {analytics.isLoading ? (
        <DashboardSkeleton />
      ) : analytics.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load analytics: {analytics.error.message}
        </div>
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
        <p className="text-sm text-muted-foreground">Could not load analytics.</p>
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
