"use server";

import { NowInsertSchema, NowSchema, nowTable } from "@/db/schema";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function upsertHosts(hosts: NowInsertSchema[]) {
  if (hosts.length === 0) {
    return;
  }

  await db
    .insert(nowTable)
    .values(hosts)
    .onConflictDoUpdate({
      target: nowTable.id,
      set: { ...hosts, ip: sql`now.ip`, mac: sql`now.mac` },
    });
}

export async function selectAllHosts(): Promise<NowSchema[]> {
  return await db.select().from(nowTable);
}
