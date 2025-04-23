import { describe, it, expect } from "vitest";
import {
  nowTable,
  nowSelectSchema,
  nowInsertSchema,
  nowUpdateSchema,
  nowDeleteSchema,
} from "@/db/schema/now";
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core"; // Assuming you're using postgres, if not change this
import { sqliteView } from "drizzle-orm/sqlite-core"; // Import sqliteView
import { z } from "zod";

export const nowTable = pgTable("now", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host_name: text("host_name"),
  ip: text("ip").unique(),
  mac: text("mac"),
  hw: text("hw"),
  date: timestamp("date"),
  known: boolean("known").default(false),
  now: boolean("now").default(true),
});

export const hostsView = sqliteView("hosts").as((qb) =>
  qb
    .select({
      id: nowTable.id,
      name: nowTable.name,
      host_name: nowTable.host_name,
      ip: nowTable.ip,
      mac: nowTable.mac,
      hw: nowTable.hw,
      date: nowTable.date,
      known: nowTable.known,
      now: nowTable.now,
    })
    .from(nowTable),
);

export const nowSelectSchema = z.object({
  id: z.number(),
  name: z.string(),
  host_name: z.string().nullable(),
  ip: z.string(),
  mac: z.string().nullable(),
  hw: z.string().nullable(),
  date: z.string().nullable(),
  known: z.boolean().nullable(),
  now: z.boolean().nullable(),
});

export const nowInsertSchema = z.object({
  name: z.string(),
  host_name: z.string().nullable(),
  ip: z.string(),
  mac: z.string().nullable(),
  hw: z.string().nullable(),
  date: z.string().nullable(),
  known: z.boolean().nullable(),
  now: z.boolean().nullable(),
});

export const nowUpdateSchema = z.object({
  name: z.string().optional(),
  host_name: z.string().nullable().optional(),
  ip: z.string().optional(),
  mac: z.string().nullable().optional(),
  hw: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  known: z.boolean().nullable().optional(),
  now: z.boolean().nullable().optional(),
});

export const nowDeleteSchema = z.object({
  id: z.number(),
});

// Ensure that "@/db/schema/now" exports the following:
// - nowTable: an object with a property _ containing .name (string) and .columns (object with id, name, host_name, ip, mac, hw, date, known, now)
// - nowSelectSchema, nowInsertSchema, nowUpdateSchema, nowDeleteSchema: Zod schemas with .safeParse method

describe("Now Schema", () => {
  describe("nowTable", () => {
    it("should have the correct table name", () => {
      expect(nowTable[Symbol.for("drizzle:Name")]).toBe("now");
    });

    it("should have the correct columns", () => {
      const columns = nowTable;

      expect(columns).toHaveProperty("id");
      expect(columns).toHaveProperty("name");
      expect(columns).toHaveProperty("host_name");
      expect(columns).toHaveProperty("ip");
      expect(columns).toHaveProperty("mac");
      expect(columns).toHaveProperty("hw");
      expect(columns).toHaveProperty("date");
      expect(columns).toHaveProperty("known");
      expect(columns).toHaveProperty("now");
    });

    it("should have id as primary key", () => {
      const idColumn = nowTable.id;
      expect(idColumn.primary).toBe(true);
    });

    it("should have ip as unique", () => {
      const ipColumn = nowTable.ip;
      expect(ipColumn.isUnique).toBe(true);
    });
  });

  describe("Zod Schemas", () => {
    it("should validate valid data with nowSelectSchema", () => {
      const validData = {
        id: 1,
        name: "Test Host",
        host_name: "test.local",
        ip: "192.168.1.1",
        mac: "00:11:22:33:44:55",
        hw: "Test Hardware",
        date: new Date().toISOString(),
        known: true,
        now: true,
      };

      const result = nowSelectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid data with nowSelectSchema", () => {
      const invalidData = {
        id: "not-a-number", // Should be a number
        name: 123, // Should be a string
        host_name: null,
        ip: "not-an-ip",
        mac: 123,
        hw: 123,
        date: "not-a-date",
        known: "not-a-boolean",
        now: "not-a-boolean",
      };

      const result = nowSelectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate valid data with nowInsertSchema", () => {
      const validData = {
        name: "Test Host",
        host_name: "test.local",
        ip: "192.168.1.1",
        mac: "00:11:22:33:44:55",
        hw: "Test Hardware",
        date: new Date().toISOString(),
        known: true,
        now: true,
      };

      const result = nowInsertSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should require name field in nowInsertSchema", () => {
      const invalidData = {
        // name is missing
        host_name: "test.local",
        ip: "192.168.1.1",
        mac: "00:11:22:33:44:55",
        hw: "Test Hardware",
        date: new Date().toISOString(),
        known: true,
        now: true,
      };

      const result = nowInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate valid data with nowUpdateSchema", () => {
      const validData = {
        name: "Updated Host",
        host_name: "updated.local",
        ip: "192.168.1.2",
      };

      const result = nowUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate partial valid data with nowUpdateSchema", () => {
      const validData = {
        name: "Updated Host",
      };

      const result = nowUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate valid data with nowDeleteSchema", () => {
      const validData = {
        id: 1,
      };

      const result = nowDeleteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid data with nowDeleteSchema", () => {
      const invalidData = {
        id: "not-a-number",
      };

      const result = nowDeleteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid data with nowInsertSchema", () => {
      const invalidData = {
        name: 123,
        host_name: 456,
        ip: 789,
        mac: 101112,
        hw: 131415,
        date: new Date().toISOString(),
        known: "true",
        now: "false",
      };

      const result = nowInsertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
