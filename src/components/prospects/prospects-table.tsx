"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Prospect } from "@/types/prospect";

type ProspectsTableProps = {
  prospects: Prospect[];
  onRowClick: (prospect: Prospect) => void;
};

const columns: ColumnDef<Prospect>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.company}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.role}</span>
    ),
  },
  {
    accessorKey: "sources",
    header: "Sources",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.sources.slice(0, 2).map((source) => (
          <Badge key={source} variant="secondary" className="text-xs font-normal">
            {source}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Added",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.createdAt}</span>
    ),
  },
];

export function ProspectsTable({ prospects, onRowClick }: ProspectsTableProps) {
  if (!prospects.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No prospects saved yet. Create your first prospect to get started.
      </div>
    );
  }

  return <DataTable columns={columns} data={prospects} onRowClick={onRowClick} />;
}
