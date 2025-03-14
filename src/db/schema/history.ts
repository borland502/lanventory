import { isNotNull, and } from "drizzle-orm";
import { int, sqliteTable, sqliteView, text } from "drizzle-orm/sqlite-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

// # drizzle schema

export const historyTable = sqliteTable("history", {
  id: int("ID").notNull().unique().primaryKey({ autoIncrement: true }),
  name: text("NAME").notNull().$type<string>(),
  host_name: text("HOST_NAME").default("").$type<string>(),
  ip: text("IP").$type<string>(),
  mac: text("MAC").$type<string>(),
  hw: text("HW").$type<string>(),
  date: text("DATE").$type<Date>(),
  known: int("KNOWN").default(0).$type<boolean>(),
  now: int("NOW").default(0).$type<boolean>(),
});

// # zod schema
// ## select schema
export const historySelectSchema = createSelectSchema(historyTable);
export type HistorySchema = z.infer<typeof historySelectSchema>;

// ## insert schema
export const historyInsertSchema = createInsertSchema(historyTable);
export type HistoryInsertSchema = z.infer<typeof historyInsertSchema>;

// ## update schema
export const historyUpdateSchema = createUpdateSchema(historyTable);
export type HistoryUpdateSchema = z.infer<typeof historyUpdateSchema>;

// ## delete schema
export const historyDeleteSchema = z.object({
  id: z.number(),
});
export type HistoryDeleteSchema = z.infer<typeof historyDeleteSchema>;
