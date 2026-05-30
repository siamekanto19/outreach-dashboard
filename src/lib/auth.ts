import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/$/, "");

  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function commaSeparatedOrigins(value?: string) {
  return (value ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

const productionUrl = normalizeOrigin(
  process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN,
);

const trustedOrigins = Array.from(
  new Set([
    ...commaSeparatedOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    productionUrl,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ].filter((origin): origin is string => Boolean(origin))),
);

export const auth = betterAuth({
  appName: "Outreach",
  ...(productionUrl ? { baseURL: productionUrl } : {}),
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});
