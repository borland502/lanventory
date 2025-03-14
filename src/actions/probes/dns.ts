"use server";
// @ts-ignore

import * as dns from "dns";
import type { IPv4 } from "ip-num";

export async function reverseLookup(ip: IPv4 | IPv4[]): Promise<string[]> {
  const ipArray = Array.isArray(ip) ? ip : [ip];
  const hostnames: Promise<string>[] = [];

  ipArray.forEach((ipAddr) => {
    hostnames.push(
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("DNS lookup timed out"));
        }, 1000);

        dns.reverse(ipAddr.toString(), (err, hostnames) => {
          clearTimeout(timer);
          if (err) {
            reject(err);
          } else {
            resolve(hostnames[0] || "");
          }
        });
      }),
    );
  });

  return Promise.all(hostnames);
}
