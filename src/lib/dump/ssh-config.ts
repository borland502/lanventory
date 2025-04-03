import SSHConfig, * as sshConfig from "ssh-config";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { selectAllHosts } from "@/app/services/host.data-service";
import { NowSchema, nowSelectSchema } from "@/db/schema";
import { readFileSync } from "node:fs";

/**
 * The function `writeHostsToSSHConfig` reads new hosts from a database and appends them to an existing
 * SSH configuration if they do not already exist.
 */
export async function writeHostsToSSHConfig() {
  // get possible new hosts from database
  const newHosts: NowSchema[] = await selectAllHosts();
  const existingHosts: SSHConfig = sshConfig.parse(
    readFileSync(`${homedir}/.ssh/config`, {
      encoding: "utf-8",
    }),
  );

  newHosts.forEach((host) => {
    const existingHost = existingHosts.find(host.name.toString);
    if (!existingHost) {
      existingHosts.append({
        Host: host.name,
        HostName: host.host_name || "",
        ForwardAgent: "true",
      });
    }
  });
}
