import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { nowTable } from "./now";

// # drizzle schema
export const portsTable = sqliteTable(
  "ports",
  {
    id: int("ID").notNull().unique().primaryKey({ autoIncrement: true }),
    host_id: int("HOST_ID").notNull().references(() => nowTable.id),
    port: int("PORT").notNull().$type<number>(),
    protocol: text("PROTOCOL").default("tcp").$type<string>(),
    service: text("SERVICE").default("").$type<string>(),
    description: text("DESCRIPTION").default("").$type<string>(),
    date: text("DATE").$type<Date>(),
  },
  (table) => {
    return {
      hostPortProtocolIdx: unique().on(table.host_id, table.port, table.protocol),
    };
  }
);

// # zod schema
// ## select schema
export const portsSelectSchema = createSelectSchema(portsTable);
export type PortsSchema = z.infer<typeof portsSelectSchema>;

// ## insert schema
export const portsInsertSchema = createInsertSchema(portsTable);
export type PortsInsertSchema = z.infer<typeof portsInsertSchema>;

// ## update schema
export const portsUpdateSchema = createUpdateSchema(portsTable);
export type PortsUpdateSchema = z.infer<typeof portsUpdateSchema>;

// ## delete schema
export const portsDeleteSchema = z.object({
  id: z.number(),
});
export type PortsDeleteSchema = z.infer<typeof portsDeleteSchema>;
