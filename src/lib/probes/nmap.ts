import { $ } from "bun";
import { promises as fs } from "fs";
import { XMLParser } from "fast-xml-parser";

export async function nmapScan(
  ipRange: string,
  outputFilename: string,
): Promise<void> {
  try {
    const { stdout, stderr } =
      await $`sudo nmap -p22,2222 -T4 -A -R --system-dns -oX ${outputFilename} ${ipRange}`;
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
  } catch (error) {
    console.error("Error running nmap scan:", error);
  }
}

export async function parseNmapXmlToSql(filename: string): Promise<string[]> {
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
  // For this example, we assume a table "now" with columns: ip, state, starttime, endtime.
  // We extract the first IPv4 address and the status state from each host.
  let hosts = nmaprun.host;
  if (!Array.isArray(hosts)) {
    hosts = [hosts];
  }
  const sqlStatements: string[] = [];

  for (const host of hosts) {
    // The host element can contain one or more address elements, so we take the first with addrtype='ipv4'
    let ip = "";
    if (host.address) {
      if (Array.isArray(host.address)) {
        const ipv4Addr = host.address.find(
          (addr: any) => addr.addrtype === "ipv4",
        );
        if (ipv4Addr) {
          ip = ipv4Addr.addr;
        }
      } else {
        if (host.address.addrtype === "ipv4") {
          ip = host.address.addr;
        }
      }
    }

    // Extract the host status state
    const state = host.status ? host.status.state : "";

    // The host element may contain starttime and endtime attributes
    const starttime = host.starttime || "NULL";
    const endtime = host.endtime || "NULL";

    // Create an SQL insert statement.
    // Adjust the column names as necessary for your "now" table schema.
    const sql = `INSERT INTO now (ip, state, starttime, endtime) VALUES ('${ip}', '${state}', ${starttime}, ${endtime});`;
    sqlStatements.push(sql);
  }

  return sqlStatements;
}
