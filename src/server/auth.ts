/*
 * Server-only authentication helpers for App Router code.
 * Reads the Better Auth session from request headers and exposes a small
 * guard for pages or layouts that must redirect anonymous users to sign in.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}
