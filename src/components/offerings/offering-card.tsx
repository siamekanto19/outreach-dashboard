import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Offering } from "@/types/offering";

type OfferingCardProps = {
  offering: Offering;
};

export function OfferingCard({ offering }: OfferingCardProps) {
  return (
    <Card className="transition-colors hover:border-border">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {offering.name}
              </h3>
              <a
                href={`https://${offering.url}`}
                className="text-xs text-muted-foreground hover:text-muted-foreground flex items-center gap-0.5"
              >
                {offering.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {offering.context}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {offering.targetAudience.split(",")[0].trim()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Updated {offering.updatedAt}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </CardContent>
    </Card>
  );
}
