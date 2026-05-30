"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Conversation } from "@/types/outreach";
import { Offering } from "@/types/offering";
import { Prospect } from "@/types/prospect";
import { ControlPanel } from "./control-panel";
import { GenerationCanvas } from "./generation-canvas";

type OutreachWorkspaceProps = {
  offerings: Offering[];
  prospects: Prospect[];
  conversation: Conversation;
};

export function OutreachWorkspace({
  offerings,
  prospects,
  conversation,
}: OutreachWorkspaceProps) {
  const utils = trpc.useUtils();
  const [selectedOfferingId, setSelectedOfferingId] = useState(
    conversation.offeringId || offerings[0]?.id || "",
  );
  const [selectedProspectId, setSelectedProspectId] = useState(
    conversation.prospectId || prospects[0]?.id || "",
  );
  const [activeConversation, setActiveConversation] =
    useState<Conversation>(conversation);

  // Fetch conversation context automatically when offering or prospect changes
  const { data: conversationData } = trpc.outreach.getConversationByContext.useQuery(
    { offeringId: selectedOfferingId, prospectId: selectedProspectId },
    { enabled: !!selectedOfferingId && !!selectedProspectId }
  );

  useEffect(() => {
    setSelectedOfferingId((current) => current || offerings[0]?.id || "");
  }, [offerings]);

  useEffect(() => {
    setSelectedProspectId((current) => current || prospects[0]?.id || "");
  }, [prospects]);

  useEffect(() => {
    if (conversationData) {
      setActiveConversation(conversationData);
    } else {
      setActiveConversation({
        id: "draft",
        offeringId: selectedOfferingId,
        prospectId: selectedProspectId,
        messages: [],
        createdAt: new Date().toISOString(),
      });
    }
  }, [conversationData, selectedOfferingId, selectedProspectId]);

  const activeOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId),
    [offerings, selectedOfferingId],
  );
  const activeProspect = useMemo(
    () => prospects.find((prospect) => prospect.id === selectedProspectId),
    [prospects, selectedProspectId],
  );

  const generateMessage = trpc.outreach.generateMessage.useMutation({
    onSuccess: async (newConversation) => {
      setActiveConversation(newConversation);
      await Promise.all([
        utils.outreach.getConversationByContext.invalidate({
          offeringId: selectedOfferingId,
          prospectId: selectedProspectId,
        }),
        utils.dashboard.analytics.invalidate(),
        utils.dashboard.latestConversation.invalidate(),
      ]);
      toast.success("Message generated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not generate message",
        description: error.message,
      });
    },
  });

  function handleGenerate() {
    if (!selectedOfferingId || !selectedProspectId) {
      toast.error("Select an offering and a prospect first.");
      return;
    }

    generateMessage.mutate({
      offeringId: selectedOfferingId,
      prospectId: selectedProspectId,
    });
  }

  function handleMessageSaved(message: Conversation["messages"][number]) {
    setActiveConversation((current) => {
      // Filter out any optimistic reply that has the same content to prevent duplication
      const filteredMessages = current.messages.filter(
        (m) => !(m.id.startsWith("optimistic-") && m.content.trim() === message.content.trim())
      );
      return {
        ...current,
        messages: [...filteredMessages, message],
      };
    });
  }

  function handleMessageRemoved(messageId: string) {
    setActiveConversation((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== messageId),
    }));
  }

  const displayConversation = activeConversation;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <ControlPanel
          offerings={offerings}
          prospects={prospects}
          selectedOfferingId={selectedOfferingId}
          selectedProspectId={selectedProspectId}
          isGenerating={generateMessage.isPending}
          onOfferingChange={setSelectedOfferingId}
          onProspectChange={setSelectedProspectId}
          onGenerate={handleGenerate}
        />
      </div>
      <div className="lg:col-span-3">
        {activeOffering && activeProspect ? (
          <GenerationCanvas
            conversation={displayConversation}
            offering={activeOffering}
            prospect={activeProspect}
            onMessageSaved={handleMessageSaved}
            onMessageRemoved={handleMessageRemoved}
          />
        ) : (
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground">
                Create an offering and prospect to start generating outreach.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
