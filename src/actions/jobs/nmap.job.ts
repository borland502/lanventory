import { networkScan } from "@/lib/probes";
import * as nodeCron from "node-cron";

// Run an initial scan on startup
async () => {
  console.info("Running initial nmap scan");
  networkScan("192.168.2.0/24");
};

export const nmapJob = nodeCron.schedule("*/90 * * * *", async () => {
  const timestamp = Date.now();
  networkScan("192.168.2.0/24");
  console.info(`Nmap job running`);
});
