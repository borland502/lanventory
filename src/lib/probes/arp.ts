import arp from "@network-utils/arp-lookup";
import type { IPv4 } from "ip-num";
import { toIP } from "@network-utils/arp-lookup";
import logger from "../logger";

export async function arpLookup(ip: IPv4 | IPv4[]): Promise<string[]> {
  const ipArray = Array.isArray(ip) ? ip : [ip];
  const hostnames: Promise<string>[] = [];

  ipArray.forEach((ipAddr) => {
    hostnames.push(
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("ARP lookup timed out"));
        }, 1000);

        logger.info(`ARP lookup for ${ipAddr.toString()}`);
        toIP(ipAddr.toString())
          .then((ipStr: string | null) => {
            if (ipStr === null) {
              throw new Error("Invalid IP address");
            }
            logger.info(`ARP lookup for ${ipStr}`);
            return arp.toMAC(ipStr);
          })
          .then((result: string | null) => {
            clearTimeout(timer);
            resolve(result || "");
          })
          .catch((err: unknown) => {
            clearTimeout(timer);
            reject(err);
          });
      }),
    );
  });

  return Promise.all(hostnames);
}
