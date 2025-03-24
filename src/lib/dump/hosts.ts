import * as hostile from "hostile";
import { selectAllHosts } from "@/app/services/host.data-service";
import { writeFile } from "node:fs";

export async function getHostsFromDatabase(): Promise<hostile.Lines> {
  return (await selectAllHosts())
    .filter((host) => host.ip && host.host_name)
    .map((host) => `${host.ip} ${host.host_name}`);
}

export async function getHostsFromEtcHosts(): Promise<hostile.Lines> {
  return new Promise((resolve, reject) => {
    hostile.get(false, (err, lines) => {
      if (err) {
        reject(err);
      } else {
        resolve(lines);
      }
    });
  });
}

export async function writeHostsToFile() {
  // get possible new hosts from database
  const newHosts = await getHostsFromDatabase();
  const existingHosts = await getHostsFromEtcHosts();

  // Combine new hosts with existing hosts
  const hosts = [...existingHosts, ...newHosts];
  // Remove duplicates
  const uniqueHosts = Array.from(new Set(hosts));

  // Write to /etc/hosts
  writeFile("/etc/hosts", uniqueHosts.join("\n"), (err) => {
    if (err) {
      console.error("Error writing to /etc/hosts:", err);
    } else {
      console.log("Hosts file updated successfully.");
    }
  });

  // get existing hosts from /etc/hosts
  // const existingHosts = hostile.get(true, function (err, lines) {
  //   if (err) {
  //     console.error("Error reading /etc/hosts:", err);
  //     return [];
  //   }
  //   return lines;
  // });

  // write new hosts to /etc/hosts if they don't already exist
  // for (const host of hosts) {
  //   const hostLine = `${host.ip} ${host.name}`;
  //   if (!existingHosts.includes(hostLine)) {
  //     hostile.set(host.ip, host.name, function(err) {
  //       if (err) {
  //         console.error("Error writing to /etc/hosts:", err);
  //       } else {
  //         console.log(`Added host: ${hostLine}`);
  //       }
  //     });
  //   }
  // }
}
