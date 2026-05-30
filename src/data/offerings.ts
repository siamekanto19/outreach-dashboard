import { Offering } from "@/types/offering";

export const dummyOfferings: Offering[] = [
  {
    id: "1",
    name: "Kakiyo",
    url: "kakiyo.com",
    context:
      "Kakiyo runs full LinkedIn outreach conversations autonomously, including qualification and meeting booking.",
    targetAudience: "B2B sales teams, SDR leaders, revenue ops",
    proofPoints: [
      "3x more meetings booked vs. manual outreach",
      "Handles qualification and objection responses",
      "Used by 50+ revenue teams",
    ],
    positioningNotes:
      "Position as the autonomous outreach agent, not another sequence tool.",
    createdAt: "2024-01-15",
    updatedAt: "2024-03-02",
  },
  {
    id: "2",
    name: "Reachly",
    url: "reachly.io",
    context:
      "Reachly is a cold email deliverability platform for B2B sales teams.",
    targetAudience: "Email marketers, outbound sales, growth teams",
    proofPoints: [
      "99.2% inbox placement rate",
      "Built-in warmup engine",
      "Real-time deliverability scoring",
    ],
    positioningNotes:
      "Focus on deliverability as a growth lever, not just a hygiene task.",
    createdAt: "2024-02-10",
    updatedAt: "2024-02-28",
  },
  {
    id: "3",
    name: "SignalForge",
    url: "signalforge.ai",
    context:
      "SignalForge helps revenue teams identify high-intent accounts from public buying signals.",
    targetAudience: "Account executives, demand gen, RevOps",
    proofPoints: [
      "Monitors 12+ signal sources",
      "2.4x pipeline conversion lift",
      "Integrates with major CRMs",
    ],
    positioningNotes:
      "Emphasize signal-driven prioritization over spray-and-pray prospecting.",
    createdAt: "2024-03-01",
    updatedAt: "2024-03-10",
  },
];
