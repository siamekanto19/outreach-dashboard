"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { OfferingsTable } from "@/components/offerings/offerings-table";
import { OfferingDetailSheet } from "@/components/offerings/offering-detail-sheet";
import { NewOfferingSheet } from "@/components/offerings/new-offering-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { Offering } from "@/types/offering";

export default function OfferingsPage() {
  const offerings = trpc.offerings.list.useQuery();
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newOfferingOpen, setNewOfferingOpen] = useState(false);

  function handleRowClick(offering: Offering) {
    setSelectedOffering(offering);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Offerings"
        description="Define what you offer to make outreach personalized and relevant."
        action={
          <Button onClick={() => setNewOfferingOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Offering
          </Button>
        }
      />

      {offerings.isLoading ? (
        <Skeleton className="h-[420px]" />
      ) : (
        <OfferingsTable
          offerings={offerings.data ?? []}
          onRowClick={handleRowClick}
        />
      )}

      <OfferingDetailSheet
        offering={selectedOffering}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <NewOfferingSheet
        open={newOfferingOpen}
        onOpenChange={setNewOfferingOpen}
      />
    </div>
  );
}
