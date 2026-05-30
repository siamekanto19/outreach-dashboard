"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Offering } from "@/types/offering";
import { Prospect } from "@/types/prospect";
import { Sparkles } from "lucide-react";
import { SystemPromptBox } from "./system-prompt-box";

type ControlPanelProps = {
  offerings: Offering[];
  prospects: Prospect[];
  selectedOfferingId: string;
  selectedProspectId: string;
  isGenerating: boolean;
  onOfferingChange: (id: string) => void;
  onProspectChange: (id: string) => void;
  onGenerate: () => void;
};

export function ControlPanel({
  offerings,
  prospects,
  selectedOfferingId,
  selectedProspectId,
  isGenerating,
  onOfferingChange,
  onProspectChange,
  onGenerate,
}: ControlPanelProps) {
  const canGenerate =
    Boolean(selectedOfferingId) && Boolean(selectedProspectId) && !isGenerating;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Generate Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offering-select">Offering</Label>
            <select
              id="offering-select"
              value={selectedOfferingId}
              onChange={(event) => onOfferingChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select an offering</option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-select">Prospect</Label>
            <select
              id="prospect-select"
              value={selectedProspectId}
              onChange={(event) => onProspectChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a prospect</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.name} - {prospect.company}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <SystemPromptBox />

      <Button
        className="w-full"
        size="lg"
        disabled={!canGenerate}
        onClick={onGenerate}
      >
        {isGenerating ? (
          <Spinner className="mr-2" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isGenerating ? "Generating..." : "Generate Message"}
      </Button>
    </div>
  );
}
