"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Prospect } from "@/types/prospect";
import { Eye } from "lucide-react";

type ProspectsTableProps = {
  prospects: Prospect[];
  onRowClick: (prospect: Prospect) => void;
};

export function ProspectsTable({ prospects, onRowClick }: ProspectsTableProps) {
  const columns = useMemo<ColumnDef<Prospect>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-foreground text-xs font-medium">{row.original.company || "—"}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.role || "—"}</span>
        ),
      },
      {
        accessorKey: "sources",
        header: "Sources",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.sources.slice(0, 2).map((source) => (
              <Badge key={source} variant="secondary" className="text-[10px] font-semibold py-0.5 px-2">
                {source}
              </Badge>
            ))}
            {!row.original.sources.length && <span className="text-muted-foreground text-xs">—</span>}
          </div>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-semibold py-0.5 px-2">
                {tag}
              </Badge>
            ))}
            {!row.original.tags.length && <span className="text-muted-foreground text-xs">—</span>}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.createdAt).toLocaleDateString("en-US", {
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

  if (!prospects.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No prospects saved yet. Create your first prospect to get started.
      </div>
    );
  }

  // Do NOT pass onRowClick to DataTable so that the rows themselves are not clickable
  return <DataTable columns={columns} data={prospects} />;
}
