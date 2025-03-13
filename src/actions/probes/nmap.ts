import { exec } from "child_process";
import { promises as fs } from "fs";
import { XMLParser } from "fast-xml-parser";
import { promisify } from "util";
import { insertHosts, upsertHosts } from "@/app/services/host.data-service";
import { NowInsertSchema } from "@/db/schema";

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

    console.info(`Found IP: ${ip}, MAC: ${mac}, HW: ${hw}`);

    // Extract the host name
    let host_name = "";
    if (host.hostnames && host.hostnames.hostname) {
      if (Array.isArray(host.hostnames.hostname)) {
        host_name = host.hostnames.hostname[0].name;
      } else {
        host_name = host.hostnames.hostname.name;
      }
    }

    // Determine the name
    let name = "";
    if (host_name) {
      const subdomain = host_name.split(".")[0];
      name = subdomain;
    } else {
      name = ip;
    }

    // Skip parsing if IP, MAC, or name is blank or null
    if (!ip || !mac || !name) {
      continue;
    }

    // Extract the host status state
    const state = host.status ? host.status.state : "";

    // Check if port 22 or 2222 is in an open state
    let portOpen = false;
    if (host.ports && host.ports.port) {
      const ports = Array.isArray(host.ports.port)
        ? host.ports.port
        : [host.ports.port];
      for (const port of ports) {
        if (
          (port.portid === "22" || port.portid === "2222") &&
          port.state.state === "open"
        ) {
          portOpen = true;
          break;
        }
      }
    }

    // Only create an SQL insert statement if port 22 or 2222 is open
    if (portOpen) {
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
  }

  return records;
}

export async function networkScan(ipRange: string, outputFilename: string) {
  "use server";

  try {
    const { stdout, stderr } = await execAsync(
      `sudo nmap -p22,2222 -T4 -A -R --system-dns -oX ${outputFilename} ${ipRange}`,
    );

    if (stderr) {
      console.error(stderr);
    }

    const hosts = await parseNmapXmlToSql(outputFilename);
    await upsertHosts(hosts);
  } catch (error) {
    console.error("Error running network scan:", error);
  }
}
