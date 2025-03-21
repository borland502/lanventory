"use server";

import { NowInsertSchema, NowSchema, nowTable } from "@/db/schema";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { reverseLookup } from "@/actions/probes/dns";
import { IPv4 } from "ip-num";
import { historyTable } from "@/db/schema";
import { merge } from "radash";

export async function upsertHosts(hosts: NowInsertSchema[]) {
  await db
    .insert(nowTable)
    .values(hosts)
    .onConflictDoUpdate({
      target: [nowTable.id],
      set: {
        known: sql`EXCLUDED.known`,
        // For example, if you have an "ip" column:
        // ip: sql`EXCLUDED.ip`,
        // Add other columns as required
      },
    });
}

// Known marks a host as known to the user and thus not to be deleted or modified
export async function moveHostsToHistory(): Promise<void> {
  const hostsToMove = await db
    .select()
    .from(nowTable)
    .where(sql`${nowTable.known} != 1`);

  if (hostsToMove.length === 0) return;

  await db.transaction(async (trx) => {
    await trx.insert(historyTable).values(hostsToMove);
    await trx.delete(nowTable).where(sql`${nowTable.known} != 1`);
  });
}

export async function selectAllHosts(): Promise<NowSchema[]> {
  return await db.select().from(nowTable);
}
