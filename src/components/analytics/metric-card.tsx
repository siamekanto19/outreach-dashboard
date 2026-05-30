import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/types/analytics";
import { TrendingUp } from "lucide-react";

type MetricCardProps = {
  metric: Metric;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              {metric.value}
            </p>
          </div>
          {metric.change && (
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <TrendingUp className="h-3 w-3" />
              {metric.change}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
