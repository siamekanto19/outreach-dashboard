/*
 * Standalone offering creation form.
 * Captures URL and manual offering context, validates the required inputs, and
 * saves new offerings through tRPC with loading and toast feedback.
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";
import { Lightbulb } from "lucide-react";

const offeringSchema = z
  .object({
    name: z.string().trim().min(1, "Offering name is required."),
    websiteUrl: z.string().trim().optional(),
    manualContext: z.string().trim().optional(),
    targetCustomers: z.string().trim().optional(),
    proofPoints: z.string().trim().optional(),
    positioning: z.string().trim().optional(),
  })
  .refine((value) => value.websiteUrl || value.manualContext, {
    message: "Add a website URL or manual context for this offering.",
    path: ["manualContext"],
  });

type OfferingFormValues = z.infer<typeof offeringSchema>;

export function OfferingForm() {
  const utils = trpc.useUtils();
  const form = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: {
      name: "",
      websiteUrl: "",
      manualContext: "",
      targetCustomers: "",
      proofPoints: "",
      positioning: "",
    },
  });
  const createOffering = trpc.offerings.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.offerings.list.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      form.reset();
      toast.success("Offering saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save offering",
        description: error.message,
      });
    },
  });

  function onSubmit(values: OfferingFormValues) {
    createOffering.mutate(values);
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          Your offering is the core value you bring to a prospect. It is what
          makes your outreach relevant to them specifically. The better your
          offering is defined, the better every message will be.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">New Offering</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offering-name">Offering name</Label>
              <Input
                id="offering-name"
                placeholder="e.g. Kakiyo"
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
              <Label htmlFor="offering-url">Website URL</Label>
              <Input
                id="offering-url"
                placeholder="e.g. kakiyo.com"
                {...form.register("websiteUrl")}
              />
              <p className="text-xs text-muted-foreground">
                If provided, Firecrawl will read this page and AI will extract
                offering context.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offering-context">Manual context</Label>
              <Textarea
                id="offering-context"
                placeholder="Describe what your offering does and why it matters..."
                rows={3}
                aria-invalid={Boolean(form.formState.errors.manualContext)}
                {...form.register("manualContext")}
              />
              {form.formState.errors.manualContext && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.manualContext.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="offering-audience">Target audience</Label>
              <Input
                id="offering-audience"
                placeholder="e.g. B2B sales teams, SDR leaders"
                {...form.register("targetCustomers")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offering-proof">Proof points</Label>
              <Textarea
                id="offering-proof"
                placeholder="Key results or evidence (one per line)"
                rows={2}
                {...form.register("proofPoints")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offering-positioning">Positioning notes</Label>
              <Textarea
                id="offering-positioning"
                placeholder="How to position this offering in messages..."
                rows={2}
                {...form.register("positioning")}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createOffering.isPending}
            >
              {createOffering.isPending && <Spinner className="mr-2" />}
              {createOffering.isPending ? "Saving..." : "Save Offering"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
