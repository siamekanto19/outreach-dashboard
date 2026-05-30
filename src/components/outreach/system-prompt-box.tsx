/*
 * Context-aware system prompt editor.
 * Loads default or selection-specific prompts and lets users save or improve
 * the instructions that guide AI outreach generation.
 */
"use client";

import { Wand2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { DEFAULT_PROMPT_VALUES } from "@/lib/default-prompt";
import { trpc } from "@/lib/trpc";
import { Info } from "lucide-react";

type PromptValues = typeof DEFAULT_PROMPT_VALUES;
type PromptErrors = Partial<Record<keyof PromptValues, string>>;

type SystemPromptBoxProps = {
  offeringId?: string;
  prospectId?: string;
};

function normalizePromptValues(values: Partial<PromptValues>): PromptValues {
  return {
    ...DEFAULT_PROMPT_VALUES,
    ...values,
    name: values.name ?? DEFAULT_PROMPT_VALUES.name,
    systemPrompt: values.systemPrompt ?? DEFAULT_PROMPT_VALUES.systemPrompt,
    tone: values.tone ?? "",
    lengthPreference: values.lengthPreference ?? "",
    avoidList: values.avoidList ?? "",
  };
}

function validatePrompt(values: PromptValues) {
  const errors: PromptErrors = {};

  if (!values.name.trim()) {
    errors.name = "Prompt name is required.";
  }

  if (values.systemPrompt.trim().length < 20) {
    errors.systemPrompt = "Add more instruction so the AI has useful guidance.";
  }

  return errors;
}

export function SystemPromptBox({ offeringId, prospectId }: SystemPromptBoxProps) {
  const utils = trpc.useUtils();
  const lastHydratedPromptKey = useRef<string | null>(null);
  const [values, setValues] = useState<PromptValues>(DEFAULT_PROMPT_VALUES);
  const [errors, setErrors] = useState<PromptErrors>({});

  const defaultPrompt = trpc.prompts.default.useQuery();
  const contextPrompt = trpc.prompts.getByContext.useQuery(
    { offeringId, prospectId },
    { enabled: !!offeringId && !!prospectId }
  );
  const promptData = contextPrompt.data ?? defaultPrompt.data;
  const promptError = contextPrompt.error ?? defaultPrompt.error;
  const promptKey = [
    offeringId || "default",
    prospectId || "default",
    promptData?.id || "built-in",
  ].join(":");

  const updateDefaultPrompt = trpc.prompts.updateDefault.useMutation({
    onSuccess: async (data) => {
      lastHydratedPromptKey.current = promptKey;
      utils.prompts.default.setData(undefined, data);
      setValues(normalizePromptValues(data));
      setErrors({});
      await utils.prompts.default.invalidate();
      toast.success("Prompt saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save prompt",
        description: error.message,
      });
    },
  });
  const savePrompt = trpc.prompts.saveForContext.useMutation({
    onSuccess: async (data) => {
      utils.prompts.getByContext.setData({ offeringId, prospectId }, data);
      lastHydratedPromptKey.current = promptKey;
      setValues(normalizePromptValues(data));
      setErrors({});
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
      setValues((current) => ({
        ...current,
        systemPrompt: data.systemPrompt,
      }));
      setErrors((current) => ({ ...current, systemPrompt: undefined }));
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
    if (promptData && lastHydratedPromptKey.current !== promptKey) {
      lastHydratedPromptKey.current = promptKey;
      setValues(normalizePromptValues(promptData));
      setErrors({});
    }
  }, [promptData, promptKey]);

  function handleImprove() {
    const currentInstructions = values.systemPrompt;
    if (currentInstructions.trim().length < 5) {
      toast.error("Please enter a short system prompt or instruction first before improving with AI.");
      return;
    }
    improvePrompt.mutate(values);
  }

  function updateField(field: keyof PromptValues) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validatePrompt(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    if (!offeringId || !prospectId) {
      updateDefaultPrompt.mutate(values);
      return;
    }
    savePrompt.mutate({
      ...values,
      offeringId,
      prospectId,
    });
  }

  const isCustom = contextPrompt.data?.isCustom ?? false;
  const isSaving = savePrompt.isPending || updateDefaultPrompt.isPending;
  const mutationError =
    savePrompt.error?.message ||
    updateDefaultPrompt.error?.message ||
    improvePrompt.error?.message;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">System Prompt</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3">
        {(defaultPrompt.isLoading || contextPrompt.isLoading) && !promptData && (
          <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Loading saved prompt settings. You can still edit the default values below.
          </div>
        )}

        {promptError && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <Info className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs text-destructive">
              Could not load prompt settings: {promptError.message}
            </AlertDescription>
          </Alert>
        )}

        {mutationError && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <Info className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs text-destructive">
              Last prompt action failed: {mutationError}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-border bg-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            The prompt is the set of instructions you give the AI before it
            generates a message. It controls tone, length, angle, what to
            emphasize, and what to avoid.
          </AlertDescription>
        </Alert>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-name" className="text-xs">
              Prompt name
            </Label>
            <Input
              id="prompt-name"
              placeholder="Default outreach prompt"
              aria-invalid={Boolean(errors.name)}
              value={values.name}
              onChange={updateField("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {errors.name}
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
                value={values.tone}
                onChange={updateField("tone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prompt-length" className="text-xs">
                Length
              </Label>
              <Input
                id="prompt-length"
                placeholder="Under 100 words"
                value={values.lengthPreference}
                onChange={updateField("lengthPreference")}
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
              value={values.avoidList}
              onChange={updateField("avoidList")}
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
              aria-invalid={Boolean(errors.systemPrompt)}
              value={values.systemPrompt}
              onChange={updateField("systemPrompt")}
            />
            {errors.systemPrompt && (
              <p className="text-xs text-destructive">
                {errors.systemPrompt}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={improvePrompt.isPending || isSaving}
              onClick={handleImprove}
            >
              {improvePrompt.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Improve with AI
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Spinner className="mr-2" />}
              {isSaving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
