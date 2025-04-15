"use server";

import { NowInsertSchema, NowSchema, nowTable } from "@/db/schema";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { historyTable } from "@/db/schema";

export async function upsertHosts(hosts: NowInsertSchema[]) {
  await db
    .insert(nowTable)
    .values(hosts)
    .onConflictDoUpdate({
      target: [nowTable.id],
      set: {
        known: sql`EXCLUDED.known`,
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

export async function selectHostsWithHostname(): Promise<NowSchema[]> {
  const hosts = await db.select().from(nowTable);
  return hosts.filter(
    (host: NowSchema) =>
      !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host.host_name || ""),
  );
}
