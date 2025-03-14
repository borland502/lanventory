"use server";

import { exec } from "child_process";
import { promises as fs } from "fs";
import { XMLParser } from "fast-xml-parser";
import { promisify } from "util";
import {
  moveHostsToHistory,
  upsertHosts,
} from "@/app/services/host.data-service";
import { NowInsertSchema, NowSchema } from "@/db/schema";

const execAsync = promisify(exec);

async function parseNmapXmlToSql(filename: string): Promise<NowInsertSchema[]> {
  // Read the entire XML file produced by nmapScan
  const xmlData = await fs.readFile(filename, "utf-8");

  // Configure fast-xml-parser to preserve attributes
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const jsonObj = parser.parse(xmlData);

  // The root object should be in a key "nmaprun"
  const nmaprun = jsonObj.nmaprun;

  // We'll generate SQL insert statements for each host found.
  let hosts = nmaprun.host;
  if (!Array.isArray(hosts)) {
    hosts = [hosts];
  }
  const records: NowInsertSchema[] = [];

  for (const host of hosts) {
    let ip = "";
    let mac = "";
    let hw = "";

    // Extract IP and MAC addresses using a switch statement
    if (host.address) {
      const addresses = Array.isArray(host.address)
        ? host.address
        : [host.address];
      for (const addr of addresses) {
        switch (addr.addrtype) {
          case "ipv4":
            ip = addr.addr;
            break;
          case "mac":
            mac = addr.addr;
            hw = addr.vendor || "";
            break;
        }
      }
    }

    // Extract the host name
    let host_name = "";
    if (host.hostnames && host.hostnames.hostname) {
      if (Array.isArray(host.hostnames.hostname)) {
        host_name = host.hostnames.hostname[0].name;
      } else {
        host_name = host.hostnames.hostname.name;
      }
    }

    console.info(`Found host: ${host_name} IP: ${ip}, MAC: ${mac}, HW: ${hw}`);

    // Determine the name
    let name = "";
    if (host_name) {
      const subdomain = host_name.split(".")[0];
      name = subdomain;
    } else {
      name = ip;
    }

    // Extract the host status state
    const state = host.status ? host.status.state : "";

    // TODO: Find a means of determining port open more reliably
    const date = new Date();
    records.push({
      ip,
      mac,
      host_name,
      name,
      hw,
      date,
      now: true,
      known: false,
    });
  }

  return records;
}

export async function networkScan(ipRange: string, outputFilename: string) {
  try {
    // TODO: Rollback if any subsequent steps fail
    await moveHostsToHistory();

    const { stdout, stderr } = await execAsync(
      `sudo nmap -p22,2222 -T4 -A -R --system-dns -oX ${outputFilename} ${ipRange}`,
    );

    if (stderr) {
      console.error(stderr);
    }

    const hosts = await parseNmapXmlToSql(outputFilename);
    console.info(`Parsed ${hosts.length} hosts from nmap XML file`);

    await upsertHosts(hosts);
  } catch (error) {
    console.error("Error running network scan:", error);
  }
}
