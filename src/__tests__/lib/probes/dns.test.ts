import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reverseLookup } from "@/lib/probes/dns";
import * as dns from "node:dns";
import { IPv4 } from "ip-num";

// Mock the dns module
vi.mock("node:dns", () => ({
  reverse: vi.fn(),
}));

describe("DNS Probe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it("should resolve a single IP address to a hostname", async () => {
    // Setup mock
    const mockHostname = "example.com";
    const mockIP = new IPv4("192.168.1.1");

    // Mock the dns.reverse function to return our test hostname
    vi.mocked(dns.reverse).mockImplementation((ip, callback) => {
      callback(null, [mockHostname]);
      return undefined as any;
    });

    // Call the function
    const result = await reverseLookup(mockIP);

    // Verify results
    expect(dns.reverse).toHaveBeenCalledWith(
      mockIP.toString(),
      expect.any(Function),
    );
    expect(result).toEqual([mockHostname]);
  });

  it("should resolve multiple IP addresses to hostnames", async () => {
    // Setup mock
    const mockHostnames = ["example1.com", "example2.com"];
    const mockIPs = [new IPv4("192.168.1.1"), new IPv4("192.168.1.2")];

    // Mock the dns.reverse function to return our test hostnames
    vi.mocked(dns.reverse).mockImplementation((ip, callback) => {
      const index = ip === "192.168.1.1" ? 0 : 1;
      callback(null, [mockHostnames[index]]);
      return undefined as any;
    });

    // Call the function
    const result = await reverseLookup(mockIPs);

    // Verify results
    expect(dns.reverse).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockHostnames);
  });

  it("should handle DNS lookup errors", async () => {
    // Setup mock
    const mockIP = new IPv4("192.168.1.1");
    const mockError = new Error("DNS lookup failed");

    // Mock the dns.reverse function to return an error
    vi.mocked(dns.reverse).mockImplementation((ip, callback) => {
      callback(mockError, []);
      return undefined as any;
    });

    // Call the function and expect it to reject
    await expect(reverseLookup(mockIP)).rejects.toThrow("DNS lookup failed");
  });

  it("should handle DNS lookup timeouts", async () => {
    // Setup mock
    const mockIP = new IPv4("192.168.1.1");

    // Mock the dns.reverse function to never call the callback (simulating timeout)
    vi.mocked(dns.reverse).mockImplementation(() => {
      return undefined as any;
    });

    // Start the promise
    const promise = reverseLookup(mockIP);

    // Advance timers to trigger timeout
    vi.advanceTimersByTime(1001);

    // Verify the promise rejects with timeout error
    await expect(promise).rejects.toThrow("DNS lookup timed out");
  });

  it("should return empty string when no hostname is found", async () => {
    // Setup mock
    const mockIP = new IPv4("192.168.1.1");

    // Mock the dns.reverse function to return empty array
    vi.mocked(dns.reverse).mockImplementation((ip, callback) => {
      callback(null, []);
      return undefined as any;
    });

    // Call the function
    const result = await reverseLookup(mockIP);

    // Verify results
    expect(result).toEqual([""]);
  });
});
