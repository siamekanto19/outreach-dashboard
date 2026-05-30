import { getAnalyticsForUser } from "@/server/data/analytics";
import { getLatestConversationForUser } from "@/server/data/outreach";
import { protectedProcedure, router } from "@/server/trpc";

export const dashboardRouter = router({
  analytics: protectedProcedure.query(({ ctx }) => {
    return getAnalyticsForUser(ctx.user.id);
  }),
  latestConversation: protectedProcedure.query(({ ctx }) => {
    return getLatestConversationForUser(ctx.user.id);
  }),
});
