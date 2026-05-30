import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ActivityItem } from "@/types/analytics";

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-0">
            {items.length ? (
              items.map((item, index) => (
                <div key={item.id}>
                  <div className="flex items-start gap-3 py-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 leading-snug">
                        {item.action}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {item.timestamp}
                      </p>
                    </div>
                  </div>
                  {index < items.length - 1 && <Separator />}
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-zinc-500">
                Activity will appear as you add prospects and generate messages.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
