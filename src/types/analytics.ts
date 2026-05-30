export type Metric = {
  label: string;
  value: number;
  change?: string;
  trend?: "up" | "down" | "neutral";
};

export type ActivityItem = {
  id: string;
  action: string;
  timestamp: string;
};

export type OfferingUsage = {
  name: string;
  messagesGenerated: number;
  percentage: number;
};
