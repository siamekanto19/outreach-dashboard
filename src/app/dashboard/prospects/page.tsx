"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { IngestionZone } from "@/components/prospects/ingestion-zone";
import { ProspectTable } from "@/components/prospects/prospect-table";
import { ProspectDetailCard } from "@/components/prospects/prospect-detail-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";

export default function ProspectsPage() {
  const prospects = trpc.prospects.list.useQuery();

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Prospects"
        description="Add and manage prospects from any source."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <IngestionZone />
          {prospects.isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <ProspectTable prospects={prospects.data ?? []} />
          )}
        </div>
        <div>
          {prospects.isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ProspectDetailCard prospect={prospects.data?.[0] ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
