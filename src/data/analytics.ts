import { Metric, ActivityItem, OfferingUsage } from "@/types/analytics";

export const dummyMetrics: Metric[] = [
  { label: "Messages Generated", value: 142, change: "+12%", trend: "up" },
  { label: "Active Offerings", value: 3, change: "+1", trend: "up" },
  { label: "Prospects Saved", value: 28, change: "+5", trend: "up" },
  { label: "Reply Conversations", value: 12, change: "+3", trend: "up" },
];

export const dummyActivity: ActivityItem[] = [
  {
    id: "a1",
    action: "Generated message for Sarah Chen using Kakiyo",
    timestamp: "2 minutes ago",
  },
  {
    id: "a2",
    action: "New prospect added: Marcus Rivera",
    timestamp: "15 minutes ago",
  },
  {
    id: "a3",
    action: "Reply pasted from Sarah Chen",
    timestamp: "1 hour ago",
  },
  {
    id: "a4",
    action: "Follow-up generated for Acme SaaS",
    timestamp: "2 hours ago",
  },
  {
    id: "a5",
    action: "Offering updated: Kakiyo",
    timestamp: "3 hours ago",
  },
  {
    id: "a6",
    action: "New prospect added: Priya Sharma",
    timestamp: "5 hours ago",
  },
  {
    id: "a7",
    action: "Generated message for James Liu using Reachly",
    timestamp: "Yesterday",
  },
];

export const dummyOfferingUsage: OfferingUsage[] = [
  { name: "Kakiyo", messagesGenerated: 89, percentage: 63 },
  { name: "Reachly", messagesGenerated: 35, percentage: 25 },
  { name: "SignalForge", messagesGenerated: 18, percentage: 12 },
];
