/*
 * Offering detail preview card.
 * Displays the selected offering's website, audience, proof points, and
 * positioning notes in a read-only summary layout.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Offering } from "@/types/offering";

type OfferingPreviewProps = {
  offering: Offering | null;
};

export function OfferingPreview({ offering }: OfferingPreviewProps) {
  if (!offering) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Save an offering to see how it will be used for message generation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Name
          </p>
          <p className="mt-1 text-sm text-foreground">{offering.name}</p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Context
          </p>
          <p className="mt-1 text-sm text-foreground leading-relaxed">
            {offering.context}
          </p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Proof Points
          </p>
          <ul className="mt-1.5 space-y-1">
            {offering.proofPoints.map((point, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Target Audience
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {offering.targetAudience.split(",").map((audience) => (
              <Badge
                key={audience.trim()}
                variant="secondary"
                className="text-xs"
              >
                {audience.trim()}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
