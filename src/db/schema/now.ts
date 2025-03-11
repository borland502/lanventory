import { isNotNull, and } from "drizzle-orm";
import { int, sqliteTable, sqliteView, text } from "drizzle-orm/sqlite-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { IPv4 } from "ip-num";

// # drizzle schema

export const nowTable = sqliteTable("now", {
  id: int("ID").notNull().unique().primaryKey({ autoIncrement: true }),
  name: text("NAME").notNull().$type<string>(),
  host_name: text("HOST_NAME").default("").$type<string>(),
  ip: text("IP").unique().$type<IPv4>(),
  mac: text("MAC").unique().$type<string>(),
  hw: text("HW").$type<string>(),
  date: text("DATE").$type<Date>(),
  known: int("KNOWN").default(0).$type<boolean>(),
  now: int("NOW").default(0).$type<boolean>(),
});

export const hostsView = sqliteView("hosts").as((qb) =>
  qb
    .select({
      ip: nowTable.ip,
      host_name: nowTable.host_name,
      name: nowTable.name,
    })
    .from(nowTable)
    .where(
      and(
        isNotNull(nowTable.ip),
        isNotNull(nowTable.host_name),
        isNotNull(nowTable.name),
      ),
    ),
);

// # zod schema
// ## select schema
export const nowSelectSchema = createSelectSchema(nowTable);
export type NowSchema = z.infer<typeof nowSelectSchema>;

export const hostsViewSchema = createSelectSchema(hostsView);
export type HostsViewSchema = z.infer<typeof hostsViewSchema>;

// ## insert schema
export const nowInsertSchema = createInsertSchema(nowTable);
export type NowInsertSchema = z.infer<typeof nowInsertSchema>;

// ## update schema
export const nowUpdateSchema = createUpdateSchema(nowTable);
export type NowUpdateSchema = z.infer<typeof nowUpdateSchema>;

// ## delete schema
export const nowDeleteSchema = z.object({
  id: z.number(),
});
export type NowDeleteSchema = z.infer<typeof nowDeleteSchema>;
