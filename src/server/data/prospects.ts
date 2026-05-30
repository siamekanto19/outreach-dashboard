/*
 * Prospect query helpers.
 * Loads user-owned prospects with their saved source labels and maps them into
 * the shape consumed by the prospects table and outreach selector.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { prospectSources, prospects } from "@/db/schema";
import { mapProspect } from "./mappers";

export async function getProspectsForUser(userId: string) {
  const rows = await db
    .select()
    .from(prospects)
    .where(eq(prospects.userId, userId))
    .orderBy(desc(prospects.updatedAt));

  if (!rows.length) {
    return [];
  }

  const sources = await db
    .select({
      prospectId: prospectSources.prospectId,
      type: prospectSources.type,
    })
    .from(prospectSources)
    .where(
      inArray(
        prospectSources.prospectId,
        rows.map((row) => row.id),
      ),
    );

  const sourceTypesByProspect = sources.reduce<Record<string, string[]>>(
    (acc, source) => {
      acc[source.prospectId] ??= [];
      if (!acc[source.prospectId].includes(source.type)) {
        acc[source.prospectId].push(source.type);
      }
      return acc;
    },
    {},
  );

  return rows.map((row) =>
    mapProspect({
      ...row,
      sourceTypes: sourceTypesByProspect[row.id],
    }),
  );
}
