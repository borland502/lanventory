import * as hostile from "hostile";
import {
  selectAllHosts,
  selectHostsWithHostname,
} from "@/app/services/host.data-service";
import { writeFile, readFile } from "node:fs";
import { $ } from "bun";
import { map, select } from "radash";
import { NowSchema } from "@/db/schema";

export async function getHostsFromDatabase() {
  return select(
    await selectHostsWithHostname(),
    (host: NowSchema) =>
      `${host.ip?.trim()} ${host.host_name?.trim()} ${host.name.trim()}`,
    (host: NowSchema) =>
      host.ip !== null && host.host_name !== null && host.ip != host.name,
  );
}

export async function getHostsFromEtcHosts() {
  const lines = await $`cat /etc/hosts`.text();
  return select(
    lines.split("\n"),
    (line: string) => line.trim(),
    (line: string) => !line.startsWith("#") && line.trim().length > 0,
  );
}

export async function getUniqueHosts() {
  const newHosts = await getHostsFromDatabase();
  console.log(JSON.stringify(newHosts, null, 2));
  const existingHosts = await getHostsFromEtcHosts();
  const hosts = [...(existingHosts || []), ...(newHosts || [])];
  return Array.from(new Set(hosts));
}

export async function writeHostsToFile() {
  // Write to /etc/hosts
  const hosts = await getUniqueHosts();
  writeFile("/etc/hosts", hosts.join("\n"), (err) => {
    if (err) {
      console.error("Error writing to /etc/hosts:", err);
    } else {
      console.log("Hosts file updated successfully.");
    }
  });
}
