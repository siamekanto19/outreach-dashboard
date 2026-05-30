"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { OfferingForm } from "@/components/offerings/offering-form";
import { OfferingList } from "@/components/offerings/offering-list";
import { OfferingPreview } from "@/components/offerings/offering-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";

export default function OfferingsPage() {
  const offerings = trpc.offerings.list.useQuery();

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Offerings"
        description="Define what you offer to make outreach personalized and relevant."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Offering
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {offerings.isLoading ? (
          <Skeleton className="h-[420px]" />
        ) : (
          <OfferingList offerings={offerings.data ?? []} />
        )}
        <div className="space-y-6">
          <OfferingForm />
          {offerings.isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <OfferingPreview offering={offerings.data?.[0] ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
