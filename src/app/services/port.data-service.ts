"use server";

import { db } from "@/db";
import { PortsInsertSchema, PortsSchema, portsTable } from "@/db/schema";
import { nowTable } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

export async function upsertPorts(ports: PortsInsertSchema[]) {
  await db
    .insert(portsTable)
    .values(ports)
    .onConflictDoUpdate({
      target: [portsTable.host_id, portsTable.port, portsTable.protocol],
      set: {
        service: sql`EXCLUDED.service`,
        description: sql`EXCLUDED.description`,
        date: sql`EXCLUDED.date`,
      },
    });
}

export async function selectAllPorts(): Promise<PortsSchema[]> {
  return await db.select().from(portsTable);
}

export async function selectPortsByHostId(hostId: number): Promise<PortsSchema[]> {
  return await db
    .select()
    .from(portsTable)
    .where(eq(portsTable.host_id, hostId));
}

export async function selectPortsByHostIp(ip: string): Promise<{
  id: number;
  host_id: number;
  port: number;
  protocol: string | null;
  service: string | null;
  description: string | null;
  date: Date | null;
  host_name: string | null;
  name: string;
}[]> {
  return await db
    .select({
      id: portsTable.id,
      host_id: portsTable.host_id,
      port: portsTable.port,
      protocol: portsTable.protocol,
      service: portsTable.service,
      description: portsTable.description,
      date: portsTable.date,
      host_name: nowTable.host_name,
      name: nowTable.name,
    })
    .from(portsTable)
    .innerJoin(nowTable, eq(portsTable.host_id, nowTable.id))
    .where(eq(nowTable.ip, ip));
}

export async function getPortsWithHostInfo(): Promise<{
  id: number;
  host_id: number;
  port: number;
  protocol: string | null;
  service: string | null;
  description: string | null;
  date: Date | null;
  ip: string | null;
  host_name: string | null;
  name: string;
}[]> {
  return await db
    .select({
      id: portsTable.id,
      host_id: portsTable.host_id,
      port: portsTable.port,
      protocol: portsTable.protocol,
      service: portsTable.service,
      description: portsTable.description,
      date: portsTable.date,
      ip: nowTable.ip,
      host_name: nowTable.host_name,
      name: nowTable.name,
    })
    .from(portsTable)
    .innerJoin(nowTable, eq(portsTable.host_id, nowTable.id));
}

export async function deletePortsByHostId(hostId: number): Promise<void> {
  await db.delete(portsTable).where(eq(portsTable.host_id, hostId));
}
