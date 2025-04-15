import {
  SQLiteBoolean,
  integer,
  text,
  sqliteTable,
} from "drizzle-orm/sqlite-core";
import { nowTable } from "@/db/schema";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

export const sshKeyTable = sqliteTable("ssh_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  pub_key: text(),
  priv_key: text().notNull(),
  type: text().notNull(),
  fingerprint: text().notNull(),
});

export const userTable = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  name: text("name").notNull(),
  hostId: integer("host_id").references(() => nowTable.id),
  keyId: integer("key_id").references(() => sshKeyTable.id),
});

export const userSelectSchema = createSelectSchema(nowTable);
export type userSchema = z.infer<typeof userSelectSchema>;

// ## insert schema
export const userInsertSchema = createInsertSchema(nowTable);
export type userInsertSchema = z.infer<typeof userInsertSchema>;

// ## update schema
export const userUpdateSchema = createUpdateSchema(nowTable);
export type userUpdateSchema = z.infer<typeof userUpdateSchema>;

// ## delete schema
export const userDeleteSchema = z.object({
  id: z.number(),
});
export type NowDeleteSchema = z.infer<typeof userDeleteSchema>;
