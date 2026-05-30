/*
 * Compact prospect list row.
 * Renders a prospect's core identity, source tags, and row-level actions for
 * list-style prospect management surfaces.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Prospect } from "@/types/prospect";

type ProspectRowProps = {
  prospect: Prospect;
  onSelect?: (prospect: Prospect) => void;
};

export function ProspectRow({ prospect, onSelect }: ProspectRowProps) {
  return (
    <tr
      className="border-b border-border transition-colors hover:bg-muted cursor-pointer"
      onClick={() => onSelect?.(prospect)}
    >
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-foreground">{prospect.name}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-muted-foreground">{prospect.company}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-muted-foreground">{prospect.role}</p>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {prospect.sources.map((source) => (
            <Badge
              key={source}
              variant="secondary"
              className="text-xs font-normal"
            >
              {source}
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {prospect.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-muted-foreground">{prospect.createdAt}</span>
      </td>
      <td className="py-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
