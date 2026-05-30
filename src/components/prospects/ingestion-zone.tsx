"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";
import { Upload, Link2, Code2, Globe, Building2 } from "lucide-react";

const prospectSchema = z.object({
  name: z.string().trim().min(1, "Prospect name is required."),
  company: z.string().trim().optional(),
  role: z.string().trim().optional(),
  manualContext: z.string().trim().optional(),
  tags: z.string().trim().optional(),
  githubUrl: z.string().trim().optional(),
  personalUrl: z.string().trim().optional(),
  companyUrl: z.string().trim().optional(),
  customUrl: z.string().trim().optional(),
});

type ProspectFormValues = z.infer<typeof prospectSchema>;

export function IngestionZone() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Add Prospect</CardTitle>
      </CardHeader>
      <CardContent>
        <SourceInputGrid />
      </CardContent>
    </Card>
  );
}

function SourceInputGrid() {
  const utils = trpc.useUtils();
  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      name: "",
      company: "",
      role: "",
      manualContext: "",
      tags: "",
      githubUrl: "",
      personalUrl: "",
      companyUrl: "",
      customUrl: "",
    },
  });
  const createProspect = trpc.prospects.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.prospects.list.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      form.reset();
      toast.success("Prospect saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save prospect",
        description: error.message,
      });
    },
  });

  function onSubmit(values: ProspectFormValues) {
    createProspect.mutate(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prospect-name">Name</Label>
          <Input
            id="prospect-name"
            placeholder="e.g. Sarah Chen"
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
          <Label htmlFor="prospect-company">Company</Label>
          <Input
            id="prospect-company"
            placeholder="e.g. Acme SaaS"
            {...form.register("company")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prospect-role">Role</Label>
          <Input
            id="prospect-role"
            placeholder="e.g. Sales Engineer"
            {...form.register("role")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prospect-tags">Tags</Label>
          <Input
            id="prospect-tags"
            placeholder="Technical, Mid-market"
            {...form.register("tags")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prospect-context">Manual context</Label>
        <Textarea
          id="prospect-context"
          placeholder="Anything useful you already know about this prospect..."
          rows={3}
          {...form.register("manualContext")}
        />
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-zinc-400">
        <Upload className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-2 text-sm font-medium text-zinc-600">
          Upload LinkedIn screenshot
        </p>
        <p className="mt-1 text-xs text-zinc-400">PNG, JPG up to 5MB</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="github-url" className="flex items-center gap-1.5 text-xs">
            <Code2 className="h-3.5 w-3.5" />
            GitHub Profile
          </Label>
          <Input
            id="github-url"
            placeholder="github.com/username"
            {...form.register("githubUrl")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="personal-url" className="flex items-center gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            Personal Website
          </Label>
          <Input
            id="personal-url"
            placeholder="example.com"
            {...form.register("personalUrl")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-url" className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Company Website
          </Label>
          <Input
            id="company-url"
            placeholder="company.com"
            {...form.register("companyUrl")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-url" className="flex items-center gap-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" />
            Additional URL
          </Label>
          <Input
            id="custom-url"
            placeholder="Any other URL"
            {...form.register("customUrl")}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={createProspect.isPending}
      >
        {createProspect.isPending && <Spinner className="mr-2" />}
        {createProspect.isPending ? "Saving..." : "Save Prospect"}
      </Button>
    </form>
  );
}
