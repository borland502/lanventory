import { HostInfo, runNmapScan } from "node-nmap-hosts";
import {
  moveHostsToHistory,
  upsertHosts,
} from "@/app/services/host.data-service";
import { NowInsertSchema } from "@/db/schema";
import { IPv4CidrRange } from "ip-num";
import { isEmpty } from "radash";

export async function networkScan(ipRange: string, ...ports: number[]) {
  try {
    // TODO: Rollback if any subsequent steps fail
    await moveHostsToHistory();

    const ipCidrRange = IPv4CidrRange.fromCidr(ipRange).toRangeSet();

    for (const ip of ipCidrRange) {
      console.log("Scanning IP:", ip.toString());
      const hostInfo: HostInfo[] = await runNmapScan(ip.toString(), [22, 2222]);

      if (isEmpty(hostInfo)) {
        continue;
      }
      const host = hostInfo.map(
        (hostInfo) =>
          ({
            ip: hostInfo.ip,
            mac: hostInfo.mac,
            host_name: hostInfo.hostname,
            name: hostInfo.hostname?.split(".")[0] || hostInfo.ip,
            hw: hostInfo.vendor,
            date: new Date(),
            now: true,
            known: false,
          }) as NowInsertSchema,
      )[0];

      await upsertHosts([host]);
    }
  } catch (error) {
    console.error("Error running network scan:", error);
  }
}
