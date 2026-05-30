import { SignUpCard } from "@/components/auth/sign-up-card";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 w-full">
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Outreach</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalized outreach at scale
          </p>
        </div>
        <SignUpCard />
      </div>
    </div>
  );
}
