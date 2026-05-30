/*
 * Context-aware system prompt editor.
 * Loads default or selection-specific prompts and lets users save or improve
 * the instructions that guide AI outreach generation.
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Info } from "lucide-react";

const promptSchema = z.object({
  name: z.string().trim().min(1, "Prompt name is required."),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Add more instruction so the AI has useful guidance."),
  tone: z.string().trim().optional(),
  lengthPreference: z.string().trim().optional(),
  avoidList: z.string().trim().optional(),
});

type PromptFormValues = z.infer<typeof promptSchema>;

type SystemPromptBoxProps = {
  offeringId?: string;
  prospectId?: string;
};

export function SystemPromptBox({ offeringId, prospectId }: SystemPromptBoxProps) {
  const utils = trpc.useUtils();
  
  // Use context-aware query to load prompt for current offering + prospect
  const prompt = trpc.prompts.getByContext.useQuery(
    { offeringId, prospectId },
    { enabled: !!offeringId && !!prospectId }
  );

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: "",
      systemPrompt: "",
      tone: "",
      lengthPreference: "",
      avoidList: "",
    },
  });

  // Save prompt mutation for selected context
  const savePrompt = trpc.prompts.saveForContext.useMutation({
    onSuccess: async (data) => {
      // Manually set React Query cache instantly to prevent stale flash
      utils.prompts.getByContext.setData({ offeringId, prospectId }, data);
      form.reset(data);
      await utils.prompts.getByContext.invalidate({ offeringId, prospectId });
      toast.success("Prompt saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save prompt",
        description: error.message,
      });
    },
  });

  const improvePrompt = trpc.prompts.improve.useMutation({
    onSuccess: (data) => {
      form.setValue("systemPrompt", data.systemPrompt, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Prompt improved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not improve prompt",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (prompt.data) {
      form.reset(prompt.data);
    }
  }, [form, prompt.data]);

  function handleImprove() {
    const currentInstructions = form.getValues("systemPrompt");
    if (!currentInstructions || currentInstructions.trim().length < 5) {
      toast.error("Please enter a short system prompt or instruction first before improving with AI.");
      return;
    }
    improvePrompt.mutate(form.getValues());
  }

  function onSubmit(values: PromptFormValues) {
    if (!offeringId || !prospectId) {
      toast.error("Please select an offering and a prospect first.");
      return;
    }
    savePrompt.mutate({
      ...values,
      offeringId,
      prospectId,
    });
  }

  if (prompt.isLoading) {
    return <Skeleton className="h-[360px]" />;
  }

  const isCustom = prompt.data?.isCustom ?? false;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">System Prompt</CardTitle>
        {prompt.data && (
          <Badge
            variant={isCustom ? "outline" : "secondary"}
            className={
              isCustom
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0.5 px-2"
                : "text-[10px] font-semibold py-0.5 px-2"
            }
          >
            {isCustom ? "Custom for selection" : "Default prompt"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-border bg-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            The prompt is the set of instructions you give the AI before it
            generates a message. It controls tone, length, angle, what to
            emphasize, and what to avoid.
          </AlertDescription>
        </Alert>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="prompt-name" className="text-xs">
              Prompt name
            </Label>
            <Input
              id="prompt-name"
              placeholder="Default outreach prompt"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prompt-tone" className="text-xs">
                Tone
              </Label>
              <Input
                id="prompt-tone"
                placeholder="Conversational, direct"
                {...form.register("tone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt-length" className="text-xs">
                Length
              </Label>
              <Input
                id="prompt-length"
                placeholder="Under 100 words"
                {...form.register("lengthPreference")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt-avoid" className="text-xs">
              Avoid
            </Label>
            <Textarea
              id="prompt-avoid"
              placeholder="Generic compliments, salesy language, hard asks"
              rows={2}
              {...form.register("avoidList")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="system-prompt" className="text-xs">
              Instructions
            </Label>
            <Textarea
              id="system-prompt"
              rows={7}
              className="text-sm"
              aria-invalid={Boolean(form.formState.errors.systemPrompt)}
              {...form.register("systemPrompt")}
            />
            {form.formState.errors.systemPrompt && (
              <p className="text-xs text-destructive">
                {form.formState.errors.systemPrompt.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={improvePrompt.isPending || savePrompt.isPending}
              onClick={handleImprove}
            >
              {improvePrompt.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Improve with AI
            </Button>
            <Button type="submit" disabled={savePrompt.isPending}>
              {savePrompt.isPending && <Spinner className="mr-2" />}
              {savePrompt.isPending ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
