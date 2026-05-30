"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prospect } from "@/types/prospect";
import { ProspectRow } from "./prospect-row";

type ProspectTableProps = {
  prospects: Prospect[];
  onSelect?: (prospect: Prospect) => void;
};

export function ProspectTable({ prospects, onSelect }: ProspectTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Company
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Role
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sources
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tags
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Added
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {prospects.length ? (
                prospects.map((prospect) => (
                  <ProspectRow
                    key={prospect.id}
                    prospect={prospect}
                    onSelect={onSelect}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No prospects saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
