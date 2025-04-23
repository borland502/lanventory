import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  upsertHosts,
  moveHostsToHistory,
  selectAllHosts,
  selectHostsWithHostname,
} from "@/app/services/host.data-service";
import { db } from "@/db";
import { nowTable } from "@/db/schema";

// Mock the database module
vi.mock("@/db", () => {
  const selectMock = vi.fn().mockReturnThis();
  const fromMock = vi.fn().mockReturnThis();
  const whereMock = vi.fn().mockReturnThis();
  const valuesMock = vi.fn().mockReturnThis();
  const insertMock = vi.fn().mockReturnThis();
  const deleteMock = vi.fn().mockReturnThis();

  return {
    db: {
      insert: insertMock,
      select: selectMock,
      from: fromMock,
      where: whereMock,
      values: valuesMock,
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      delete: deleteMock,
      transaction: vi.fn().mockImplementation(async (callback) => {
        const trx = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        };
        // Execute the callback with the mock transaction object
        await callback(trx);
        return trx;
      }) as any,
    },
  };
});

// Mock the sql function from drizzle-orm
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    sql: vi.fn().mockImplementation((strings) => strings),
  };
});

describe("Host Data Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("moveHostsToHistory", () => {
    it("should move non-known hosts to history", async () => {
      // Setup mock data
      const mockHosts = [
        {
          id: 1,
          name: "Host 1",
          host_name: "host1.local",
          ip: "192.168.1.1",
          mac: "00:11:22:33:44:55",
          hw: "Hardware 1",
          date: new Date(),
          now: true,
          known: false,
        },
        {
          id: 2,
          name: "Host 2",
          host_name: "host2.local",
          ip: "192.168.1.2",
          mac: "00:11:22:33:44:66",
          hw: "Hardware 2",
          date: new Date(),
          now: true,
          known: false,
        },
      ];

      // Mock the select query to return our test hosts
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce(mockHosts),
        }),
      } as any);

      // Mock the transaction function
      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const trx = {
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        };
        await callback(trx);
      });

      // Call the function
      await moveHostsToHistory();

      // Verify the database operations
      expect(db.select).toHaveBeenCalled();
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should do nothing if no hosts to move", async () => {
      // Mock the select query to return empty array
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce([]),
        }),
      } as any);

      // Call the function
      await moveHostsToHistory();

      // Verify the transaction was not called
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe("selectAllHosts", () => {
    it("should return all hosts", async () => {
      // Setup mock data
      const mockHosts = [
        {
          id: 1,
          name: "Host 1",
          host_name: "host1.local",
          ip: "192.168.1.1",
          mac: "00:11:22:33:44:55",
          hw: "Hardware 1",
          date: new Date(),
          now: true,
          known: true,
        },
        {
          id: 2,
          name: "Host 2",
          host_name: "host2.local",
          ip: "192.168.1.2",
          mac: "00:11:22:33:44:66",
          hw: "Hardware 2",
          date: new Date(),
          now: true,
          known: false,
        },
      ];

      // Mock the select query to return our test hosts
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce(mockHosts),
      } as any);

      // Call the function
      const result = await selectAllHosts();

      // Verify the result
      expect(result).toEqual(mockHosts);
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("selectHostsWithHostname", () => {
    it("should return hosts with valid hostnames", async () => {
      // Setup mock data
      const mockHosts = [
        {
          id: 1,
          name: "Host 1",
          host_name: "host1.local",
          ip: "192.168.1.1",
          mac: "00:11:22:33:44:55",
          hw: "Hardware 1",
          date: new Date(),
          now: true,
          known: true,
        },
        {
          id: 2,
          name: "Host 2",
          host_name: "192.168.1.2", // IP address as hostname
          ip: "192.168.1.2",
          mac: "00:11:22:33:44:66",
          hw: "Hardware 2",
          date: new Date(),
          now: true,
          known: false,
        },
        {
          id: 3,
          name: "Host 3",
          host_name: "host3.local",
          ip: "192.168.1.3",
          mac: "00:11:22:33:44:77",
          hw: "Hardware 3",
          date: new Date(),
          now: true,
          known: false,
        },
      ];

      // Mock the select query to return our test hosts
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce(mockHosts),
      } as any);

      // Call the function
      const result = await selectHostsWithHostname();

      // Verify the result - should only include hosts with non-IP hostnames
      expect(result).toHaveLength(2);
      expect(result[0].host_name).toBe("host1.local");
      expect(result[1].host_name).toBe("host3.local");
      expect(db.select).toHaveBeenCalled();
    });
  });
});
