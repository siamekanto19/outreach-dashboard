# Outreach Dashboard

A full-stack outreach workspace for defining offerings, saving flexible prospect context, customizing AI prompts, generating personalized outbound messages, handling replies, and reviewing simple analytics.

## Local Setup

```bash
npm install
cp .env.example .env.local # or create the variables below
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

Required environment variables:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
BETTER_AUTH_TRUSTED_ORIGINS=
FIRECRAWL_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

For production, set `BETTER_AUTH_URL` to the exact deployed app origin, for example `https://your-app.vercel.app`. If you use multiple production or preview domains, add them to `BETTER_AUTH_TRUSTED_ORIGINS` as a comma-separated list.

## Product Flow

1. Sign up or sign in with email and password.
2. Create an offering manually, from a website URL, or both.
3. Customize the system prompt for a selected offering and prospect.
4. Save a prospect with manual notes, GitHub/profile/company URLs, or a LinkedIn screenshot.
5. Generate an outbound message.
6. Paste a prospect reply and generate a contextual follow-up.
7. Review analytics for message volume, offering usage, saved prospects, and reply conversations.

## Architecture

- Next.js App Router with client-side dashboard data fetching.
- tRPC protected procedures for product workflows.
- TanStack Query through tRPC for loading, mutation, invalidation, and cache updates.
- Better Auth for email/password authentication.
- Drizzle ORM with Postgres for persistence.
- Firecrawl for website scraping.
- OpenRouter for text and image-aware AI extraction/generation.
- React Hook Form and Zod for forms.
- Sonner via `src/lib/toast.ts` for notifications.

Important paths:

- Auth: `src/lib/auth.ts`, `src/lib/auth-client.ts`
- Database schema: `src/db/schema/`
- tRPC routers: `src/server/routers/`
- AI helper: `src/server/ai/openrouter.ts`
- Scraping helper: `src/server/scraping/firecrawl.ts`
- Dashboard UI: `src/app/dashboard/`, `src/components/`

## AI Context Design

Message generation sends the selected offering, selected prospect, saved prompt, prompt preferences, and conversation history to OpenRouter. Follow-ups explicitly continue the existing thread instead of restarting cold outreach.

Prospect creation accepts flexible context. URLs are scraped and summarized; LinkedIn screenshots are sent through image-capable generation; manual context is preserved and combined with extracted summaries.

## Example Outputs

Offering input: Kakiyo, a tool that automates LinkedIn qualification and conversation handling for sales teams.

Prompt input: conversational, under 100 words, lead with a relevant observation, avoid hard asks, end with a soft question.

Prospect input: Sarah Chen, sales engineer at a B2B SaaS company, recently discussed outreach volume and qualification bottlenecks.

Generated outbound example:

> Hey Sarah, saw your note about outreach volume turning into a qualification problem. That is exactly the gap Kakiyo is built around: it helps run the LinkedIn conversation and qualify the lead before a rep has to jump in. Might be worth a look if your team is trying to scale without making every thread feel automated?

Prospect reply:

> Interesting, how does it actually work? Does it need access to my LinkedIn account?

Generated follow-up example:

> Good question. Kakiyo connects to the workflow you already use and handles the conversation logic around qualification, so the setup depends on how you want LinkedIn messages routed. The important part is that it is not just blasting templates; it uses the prospect context and conversation state to decide the next reply. Want me to send the short version of the setup flow?

## Tradeoffs

- Prospect screenshot handling stores only a truncated source marker, not the full image, to avoid keeping large base64 payloads in the database.
- URL scraping failures do not block prospect creation when other context exists; failed sources are stored with status so the user still keeps the prospect.
- Analytics are intentionally simple and focused on assignment-critical numbers rather than attribution-heavy reporting.
- Prompt customization is scoped by offering and prospect, with a default fallback to keep the generation flow fast.

## With More Time

- Add password reset.
- Add delete/archive controls for offerings and prospects.
- Add background jobs for long-running scraping and screenshot extraction.
- Add richer message experiments by tone or angle.
- Add deployment seed/demo data and a guided walkthrough mode.

## Verification

```bash
npm run typecheck
npm run build
```
