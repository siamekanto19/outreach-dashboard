import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Prospect } from "@/types/prospect";

type ProspectDetailCardProps = {
  prospect: Prospect | null;
};

export function ProspectDetailCard({ prospect }: ProspectDetailCardProps) {
  if (!prospect) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Prospect Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            Add a prospect to see their saved sources and context.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Prospect Detail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Name
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {prospect.name}
          </p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Company
          </p>
          <p className="mt-1 text-sm text-zinc-700">{prospect.company}</p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Role
          </p>
          <p className="mt-1 text-sm text-zinc-700">{prospect.role}</p>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Sources
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {prospect.sources.map((source) => (
              <Badge key={source} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Tags
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {prospect.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Added
          </p>
          <p className="mt-1 text-xs text-zinc-500">{prospect.createdAt}</p>
        </div>
      </CardContent>
    </Card>
  );
}
