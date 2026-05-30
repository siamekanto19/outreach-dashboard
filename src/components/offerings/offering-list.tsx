import { Offering } from "@/types/offering";
import { OfferingCard } from "./offering-card";

type OfferingListProps = {
  offerings: Offering[];
};

export function OfferingList({ offerings }: OfferingListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Saved Offerings
        </h2>
        <span className="text-xs text-muted-foreground">
          {offerings.length} offering{offerings.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-3">
        {offerings.length ? (
          offerings.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No offerings saved yet.
          </div>
        )}
      </div>
    </div>
  );
}
