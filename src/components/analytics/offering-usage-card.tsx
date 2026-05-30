import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OfferingUsage } from "@/types/analytics";

type OfferingUsageCardProps = {
  offerings: OfferingUsage[];
};

export function OfferingUsageCard({ offerings }: OfferingUsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Top Offerings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {offerings.length ? (
          offerings.map((offering) => (
            <div key={offering.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  {offering.name}
                </span>
                <span className="text-muted-foreground">
                  {offering.messagesGenerated} messages
                </span>
              </div>
              <Progress value={offering.percentage} className="h-2" />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Offering usage will appear after message generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
