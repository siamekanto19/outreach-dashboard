/*
 * Root tRPC application router.
 * Collects every feature router into the single API surface that the Next.js
 * route handler and client-side tRPC hooks use throughout the app.
 */
import { dashboardRouter } from "@/server/routers/dashboard";
import { offeringsRouter } from "@/server/routers/offerings";
import { outreachRouter } from "@/server/routers/outreach";
import { promptsRouter } from "@/server/routers/prompts";
import { prospectsRouter } from "@/server/routers/prospects";
import { router } from "@/server/trpc";

export const appRouter = router({
  dashboard: dashboardRouter,
  offerings: offeringsRouter,
  outreach: outreachRouter,
  prompts: promptsRouter,
  prospects: prospectsRouter,
});

export type AppRouter = typeof appRouter;
