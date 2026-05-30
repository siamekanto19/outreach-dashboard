/*
 * Prospect detail and edit side sheet.
 * Shows saved prospect context and lets users edit profile fields, tags, and
 * manual notes with validation, loading state, and toast feedback.
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
import { Pencil, X } from "lucide-react";
import { Prospect } from "@/types/prospect";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

const editSchema = z.object({
  name: z.string().trim().min(1, "Prospect name is required."),
  company: z.string().trim().optional(),
  role: z.string().trim().optional(),
  manualContext: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type ProspectDetailSheetProps = {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProspectDetailSheet({
  prospect,
  open,
  onOpenChange,
}: ProspectDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      company: "",
      role: "",
      manualContext: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (prospect && open) {
      form.reset({
        name: prospect.name,
        company: prospect.company === "Not specified" ? "" : prospect.company,
        role: prospect.role === "Not specified" ? "" : prospect.role,
        manualContext: prospect.manualContext,
        tags: prospect.tags.join(", "),
      });
      setIsEditing(false);
    }
  }, [prospect, open, form]);

  const updateProspect = trpc.prospects.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.prospects.list.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      setIsEditing(false);
      toast.success("Prospect updated.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not update prospect",
        description: error.message,
      });
    },
  });

  function onSubmit(values: EditFormValues) {
    if (!prospect) return;
    updateProspect.mutate({ id: prospect.id, ...values });
  }

  if (!prospect) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Prospect" : prospect.name}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update prospect details" : "Prospect details and context"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
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
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  {...form.register("company")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Input
                  id="edit-role"
                  {...form.register("role")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-context">Context</Label>
                <Textarea
                  id="edit-context"
                  rows={4}
                  placeholder="Anything useful you already know about this prospect..."
                  {...form.register("manualContext")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  placeholder="Comma-separated tags"
                  {...form.register("tags")}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Company
                </p>
                <p className="mt-1 text-sm text-foreground">{prospect.company}</p>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Role
                </p>
                <p className="mt-1 text-sm text-foreground">{prospect.role}</p>
              </div>

              {prospect.sources.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sources
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {prospect.sources.map((source) => (
                        <Badge key={source} variant="secondary" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {prospect.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tags
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {prospect.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {prospect.manualContext && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Context
                    </p>
                    <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {prospect.manualContext}
                    </p>
                  </div>
                </>
              )}

              {prospect.aiProfileSummary && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      AI Profile Summary
                    </p>
                    <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {prospect.aiProfileSummary}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="text-xs text-muted-foreground">
                <span>Added {prospect.createdAt}</span>
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
                disabled={updateProspect.isPending}
                onClick={form.handleSubmit(onSubmit)}
              >
                {updateProspect.isPending && <Spinner className="mr-2" />}
                {updateProspect.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Prospect
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
