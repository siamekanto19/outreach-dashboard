/*
 * Offering detail and edit side sheet.
 * Shows saved offering context and lets users update website, audience, proof,
 * and positioning fields with validation and mutation feedback.
 */
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ExternalLink, Pencil, X } from "lucide-react";
import { Offering } from "@/types/offering";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

const editSchema = z.object({
  name: z.string().trim().min(1, "Offering name is required."),
  websiteUrl: z.string().trim().optional(),
  manualContext: z.string().trim().optional(),
  targetCustomers: z.string().trim().optional(),
  proofPoints: z.string().trim().optional(),
  positioning: z.string().trim().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type OfferingDetailSheetProps = {
  offering: Offering | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OfferingDetailSheet({
  offering,
  open,
  onOpenChange,
}: OfferingDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      websiteUrl: "",
      manualContext: "",
      targetCustomers: "",
      proofPoints: "",
      positioning: "",
    },
  });

  useEffect(() => {
    if (offering && open) {
      form.reset({
        name: offering.name,
        websiteUrl: offering.url,
        manualContext: offering.context,
        targetCustomers: offering.targetAudience === "Not specified" ? "" : offering.targetAudience,
        proofPoints: offering.proofPoints.join("\n"),
        positioning: offering.positioningNotes === "No positioning notes yet." ? "" : offering.positioningNotes,
      });
      setIsEditing(false);
    }
  }, [offering, open, form]);

  const updateOffering = trpc.offerings.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.list.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("Offering updated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not update offering",
        description: error.message,
      });
    },
  });

  function onSubmit(values: EditFormValues) {
    if (!offering) return;
    updateOffering.mutate({ id: offering.id, ...values });
  }

  if (!offering) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Offering" : offering.name}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update offering details" : "Offering details and context"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Offering name</Label>
                <Input
                  id="edit-name"
                  aria-invalid={Boolean(form.formState.errors.name)}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">Website URL</Label>
                <Input
                  id="edit-url"
                  {...form.register("websiteUrl")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-context">Context</Label>
                <Textarea
                  id="edit-context"
                  rows={4}
                  {...form.register("manualContext")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-audience">Target audience</Label>
                <Input
                  id="edit-audience"
                  placeholder="e.g. B2B sales teams, SDR leaders"
                  {...form.register("targetCustomers")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-proof">Proof points</Label>
                <Textarea
                  id="edit-proof"
                  placeholder="One per line"
                  rows={3}
                  {...form.register("proofPoints")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-positioning">Positioning notes</Label>
                <Textarea
                  id="edit-positioning"
                  rows={3}
                  {...form.register("positioning")}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {offering.url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Website
                  </p>
                  <a
                    href={`https://${offering.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-sm text-foreground hover:text-muted-foreground"
                  >
                    {offering.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Context
                </p>
                <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {offering.context}
                </p>
              </div>

              {offering.targetAudience && offering.targetAudience !== "Not specified" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Target Audience
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                </>
              )}

              {offering.proofPoints.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Proof Points
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {offering.proofPoints.map((point, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-muted-foreground mt-0.5">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {offering.positioningNotes && offering.positioningNotes !== "No positioning notes yet." && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Positioning Notes
                    </p>
                    <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {offering.positioningNotes}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created {offering.createdAt}</span>
                <span>Updated {offering.updatedAt}</span>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setIsEditing(false);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={updateOffering.isPending}
                onClick={form.handleSubmit(onSubmit)}
              >
                {updateOffering.isPending && <Spinner className="mr-2" />}
                {updateOffering.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Offering
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
