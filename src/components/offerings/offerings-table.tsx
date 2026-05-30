"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Offering } from "@/types/offering";
import { Eye } from "lucide-react";

type OfferingsTableProps = {
  offerings: Offering[];
  onRowClick: (offering: Offering) => void;
};

export function OfferingsTable({ offerings, onRowClick }: OfferingsTableProps) {
  function externalUrl(url: string) {
    return url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  }

  const columns = useMemo<ColumnDef<Offering>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "url",
        header: "Website",
        cell: ({ row }) =>
          row.original.url ? (
            <a
              href={externalUrl(row.original.url)}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium text-xs"
              onClick={(e) => e.stopPropagation()} // Prevent any bubbling
            >
              {row.original.url}
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        accessorKey: "targetAudience",
        header: "Target Audience",
        cell: ({ row }) => {
          const audience = row.original.targetAudience;
          const first = audience?.split(",")[0]?.trim();
          return first ? (
            <Badge variant="secondary" className="text-[10px] font-semibold py-0.5 px-2">
              {first}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end pr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRowClick(row.original)}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-full"
              iconStrokeWidth={1.8}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onRowClick]
  );

  if (!offerings.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No offerings saved yet. Create your first offering to get started.
      </div>
    );
  }

  // Do NOT pass onRowClick to DataTable so that the rows themselves are not clickable
  return <DataTable columns={columns} data={offerings} />;
}
