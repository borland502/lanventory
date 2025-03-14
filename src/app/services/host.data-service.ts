"use server";

import { NowInsertSchema, NowSchema, nowTable } from "@/db/schema";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { reverseLookup } from "@/actions/probes/dns";
import { IPv4 } from "ip-num";
import { historyTable } from "@/db/schema";
import { merge } from "radash";

export async function upsertHosts(hosts: NowInsertSchema[]) {
  if (hosts.length === 0) {
    return;
  }

  let prunedHosts = [];

  for (const host of hosts) {
    if (!host?.host_name || host.host_name.length === 0) {
      const ip = host.ip;
      try {
        host.host_name = (
          await reverseLookup(IPv4.fromString(ip?.toString() || ""))
        )[0];
        if (!host?.host_name || host.host_name.length === 0) {
          host.name = host.host_name.split(".")[0];
          prunedHosts.push(host);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  console.info("hosts before merge" + hosts.length);
  hosts = merge(hosts, prunedHosts, (f: NowInsertSchema) => f.ip);
  console.info("hosts after merge" + hosts.length);

  await db.insert(nowTable).values(hosts);
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
