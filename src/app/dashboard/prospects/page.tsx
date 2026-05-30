"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ProspectsTable } from "@/components/prospects/prospects-table";
import { ProspectDetailSheet } from "@/components/prospects/prospect-detail-sheet";
import { NewProspectSheet } from "@/components/prospects/new-prospect-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { Prospect } from "@/types/prospect";

export default function ProspectsPage() {
  const prospects = trpc.prospects.list.useQuery();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newProspectOpen, setNewProspectOpen] = useState(false);

  function handleRowClick(prospect: Prospect) {
    setSelectedProspect(prospect);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Prospects"
        description="Add and manage prospects from any source."
        action={
          <Button onClick={() => setNewProspectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
        }
      />

      {prospects.isLoading ? (
        <Skeleton className="h-[420px]" />
      ) : (
        <ProspectsTable
          prospects={prospects.data ?? []}
          onRowClick={handleRowClick}
        />
      )}

      <ProspectDetailSheet
        prospect={selectedProspect}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <NewProspectSheet
        open={newProspectOpen}
        onOpenChange={setNewProspectOpen}
      />
    </div>
  );
}
