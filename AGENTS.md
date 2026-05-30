<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project Guide

## Product Goal

This is a full-stack outreach dashboard. The app helps a signed-in user define offerings, customize AI prompts, save prospects from flexible sources, generate personalized outreach, handle replies, and view simple analytics.

Message quality matters. Avoid generic AI output. Any AI generation should use the selected offering, prompt, prospect context, and conversation history.

## Architecture Decisions

- Use Next.js App Router with Next 16. Read local docs in `node_modules/next/dist/docs/` before changing framework behavior.
- Avoid React Server Components for product data UX. Dashboard pages should use client-side tRPC queries/mutations with loading skeletons.
- Use tRPC for app data APIs. Do not add new server actions for product workflows.
- Use React Hook Form with Zod validation for all forms.
- Use TanStack Query through tRPC for fetching, mutation, invalidation, loading, and cache updates.
- Use Better Auth for email/password auth.
- Use Drizzle ORM with Postgres for persistence.
- Use Firecrawl for website scraping.
- Use OpenRouter for AI calls.
- Use Sonner through `src/lib/toast.ts` for toast notifications.

## Important Files

- Auth config: `src/lib/auth.ts`
- Auth client: `src/lib/auth-client.ts`
- Database client: `src/db/index.ts`
- Database schema: `src/db/schema/`
- tRPC root: `src/server/root.ts`
- tRPC context/helpers: `src/server/trpc.ts`
- tRPC route handler: `src/app/api/trpc/[trpc]/route.ts`
- tRPC client: `src/lib/trpc.ts`
- App providers: `src/components/providers/`
- OpenRouter helper: `src/server/ai/openrouter.ts`
- Firecrawl helper: `src/server/scraping/firecrawl.ts`

## Data Ownership

All user-owned records must be scoped by `userId`.

Before returning or mutating offerings, prospects, prompts, messages, or conversations, verify ownership through the authenticated Better Auth user in the tRPC context.

## Forms

All new forms should:

- Use `react-hook-form`.
- Use `zodResolver`.
- Show inline validation errors.
- Use tRPC mutations.
- Disable submit buttons while pending.
- Show a spinner in pending buttons.
- Show Sonner success/error toasts.
- Invalidate relevant tRPC queries after successful mutations.

Do not use raw `FormData` submission or server actions for new product forms.

## tRPC Patterns

Use protected procedures for authenticated product features:

```ts
protectedProcedure.input(schema).mutation(async ({ ctx, input }) => {
  // ctx.user is authenticated
});
```

After mutations, invalidate the queries that render affected data, for example:

- `utils.offerings.list.invalidate()`
- `utils.prospects.list.invalidate()`
- `utils.dashboard.analytics.invalidate()`
- `utils.dashboard.latestConversation.invalidate()`

## AI Rules

OpenRouter calls should:

- Use `completeWithOpenRouter`.
- Fail with useful messages.
- Return focused text or strict JSON when needed.
- Never silently swallow empty model output.
- Include enough context to avoid generic outreach.

For outreach generation, include:

- selected offering details
- selected prospect details
- saved system prompt
- conversation history for replies/follow-ups

For follow-up generation, do not restart the cold outreach. Continue the existing conversation and answer the prospect directly.

## Firecrawl Rules

Firecrawl is currently integrated for offering URL ingestion.

Use `scrapeUrlWithFirecrawl(url)` for website scraping. It calls:

- `POST https://api.firecrawl.dev/v2/scrape`
- `formats: ["markdown"]`
- `onlyMainContent: true`

When adding prospect-source ingestion later, keep the same pattern:

- scrape URL
- save raw content
- summarize/extract with OpenRouter
- store extracted context in the database

## UX Expectations

- Use loading skeletons for page-level tRPC queries.
- Use inline empty states for no offerings, prospects, messages, or analytics.
- Buttons that trigger async work need disabled states and spinners.
- Native HTML `<select>` is preferred in the outreach control panel for readability.
- Conversation history should be scrollable and easy to scan.
- Avoid dead/demo buttons. If a control is visible, it should either work or clearly communicate that it is not implemented yet.

## Database

Use Drizzle schema files in `src/db/schema/`.

After schema changes, run:

```bash
npm run db:push
```

Verify with:

```bash
npm run typecheck
npm run build
```

## Environment Variables

Expected variables:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
FIRECRAWL_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

Do not expose secret values in client code. Keep Firecrawl and OpenRouter calls on the server side.

## Quality Bar

This is a take-home project. Code should be readable and shaped like a product that can grow. Prefer simple, explicit modules over clever abstractions. Prioritize the end-to-end flow:

1. Sign up/sign in.
2. Create offering.
3. Customize prompt.
4. Save prospect.
5. Generate outreach.
6. Paste prospect reply and generate follow-up.
7. View analytics.
