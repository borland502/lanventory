"use server";

import { NowInsertSchema, NowSchema, nowTable, portsTable } from "@/db/schema";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { historyTable } from "@/db/schema";

export async function upsertHosts(hosts: NowInsertSchema[]) {
  await db
    .insert(nowTable)
    .values(hosts)
    .onConflictDoUpdate({
      target: [nowTable.ip],
      set: {
        mac: sql`EXCLUDED.mac`,
        host_name: sql`EXCLUDED.host_name`,
        name: sql`EXCLUDED.name`,
        hw: sql`EXCLUDED.hw`,
        date: sql`EXCLUDED.date`,
        now: sql`EXCLUDED.now`,
        // Don't update known status if it's already set
        // known: sql`EXCLUDED.known`,
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
    // First delete any port records for hosts that will be moved
    for (const host of hostsToMove) {
      if (host.id) {
        await trx.delete(portsTable).where(sql`${portsTable.host_id} = ${host.id}`);
      }
    }
    
    // Then move hosts to history and delete from now table
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
