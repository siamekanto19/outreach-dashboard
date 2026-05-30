/*
 * Offering query helpers.
 * Loads the authenticated user's offerings in display order and maps database
 * rows into the UI-friendly offering type.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerings } from "@/db/schema";
import { mapOffering } from "./mappers";

export async function getOfferingsForUser(userId: string) {
  const rows = await db
    .select()
    .from(offerings)
    .where(eq(offerings.userId, userId))
    .orderBy(desc(offerings.updatedAt));

  return rows.map(mapOffering);
}
