"use client";

import { useState, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";
import { Link2, Code2, Globe, Building2, Upload, X, ImageIcon } from "lucide-react";

const prospectSchema = z
  .object({
    name: z.string().trim().min(1, "Prospect name is required."),
    company: z.string().trim().optional(),
    role: z.string().trim().optional(),
    manualContext: z.string().trim().optional(),
    tags: z.string().trim().optional(),
    githubUrl: z.string().trim().optional(),
    personalUrl: z.string().trim().optional(),
    companyUrl: z.string().trim().optional(),
    customUrl: z.string().trim().optional(),
    linkedinImage: z.string().trim().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.manualContext ||
          value.githubUrl ||
          value.personalUrl ||
          value.companyUrl ||
          value.customUrl ||
          value.linkedinImage,
      ),
    {
      message: "Add at least one context source for this prospect.",
      path: ["manualContext"],
    },
  );

type ProspectFormValues = z.infer<typeof prospectSchema>;

type NewProspectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewProspectSheet({ open, onOpenChange }: NewProspectSheetProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      linkedinImage: "",
    },
  });

  const createProspect = trpc.prospects.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.prospects.list.invalidate(),
        utils.dashboard.analytics.invalidate(),
      ]);
      form.reset();
      setImagePreview(null);
      onOpenChange(false);
      toast.success("Prospect saved.");
    },
    onError: (error) => {
      toast.error({
        title: "Could not save prospect",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setImagePreview(null);
    }
  }, [open, form]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error({ title: "Invalid file", description: "Please upload an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error({ title: "File too large", description: "Image must be under 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      form.setValue("linkedinImage", base64);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
    form.setValue("linkedinImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onSubmit(values: ProspectFormValues) {
    createProspect.mutate(values);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Add Prospect</SheetTitle>
          <SheetDescription>
            Add a new prospect from any source.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4">
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
              <Label>LinkedIn profile screenshot</Label>
              {imagePreview ? (
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="LinkedIn preview"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="p-2 bg-muted flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    AI will extract profile context from this image
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-border p-6 text-center transition-colors hover:border-foreground/20 hover:bg-muted"
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Upload LinkedIn screenshot
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
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
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button
            type="button"
            className="w-full"
            disabled={createProspect.isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {createProspect.isPending && <Spinner className="mr-2" />}
            {createProspect.isPending ? "Saving..." : "Save Prospect"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
