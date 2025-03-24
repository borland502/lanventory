"use server";

import { networkScan } from "@/lib/probes";
import cron from "node-cron";

export async function scheduleNmapScanJob() {
  // Schedule the task to run every 90 minutes
  cron.schedule("0 */90 * * * *", async () => {
    console.log("Running scheduled nmap scan...");
    try {
      await networkScan("192.168.2.0/24", 22, 2222);
      console.log("Scheduled nmap scan completed.");
    } catch (error) {
      console.error("Error running scheduled nmap scan:", error);
    }
  });
}
