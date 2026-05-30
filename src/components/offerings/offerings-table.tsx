"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Offering } from "@/types/offering";

type OfferingsTableProps = {
  offerings: Offering[];
  onRowClick: (offering: Offering) => void;
};

const columns: ColumnDef<Offering>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "url",
    header: "Website",
    cell: ({ row }) =>
      row.original.url ? (
        <span className="text-muted-foreground">{row.original.url}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "targetAudience",
    header: "Target Audience",
    cell: ({ row }) => {
      const audience = row.original.targetAudience;
      const first = audience.split(",")[0]?.trim();
      return first ? (
        <Badge variant="secondary" className="text-xs">
          {first}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.updatedAt}</span>
    ),
  },
];

export function OfferingsTable({ offerings, onRowClick }: OfferingsTableProps) {
  if (!offerings.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No offerings saved yet. Create your first offering to get started.
      </div>
    );
  }

  return <DataTable columns={columns} data={offerings} onRowClick={onRowClick} />;
}
