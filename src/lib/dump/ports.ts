import { getPortsWithHostInfo } from "@/app/services/port.data-service";
import { writeFile } from "node:fs";

/**
 * Generates a table that associates open ports with descriptions, using the primary host key
 * @returns A formatted string containing the table
 */
export async function generatePortsTable(): Promise<string> {
  const portsWithHosts = await getPortsWithHostInfo();
  
  if (portsWithHosts.length === 0) {
    return "No port information available.";
  }
  
  // Group ports by host
  const hostMap = new Map<string, typeof portsWithHosts>();
  
  for (const portInfo of portsWithHosts) {
    const hostKey = portInfo.name || portInfo.host_name || portInfo.ip || "Unknown";
    
    if (!hostMap.has(hostKey)) {
      hostMap.set(hostKey, []);
    }
    
    hostMap.get(hostKey)?.push(portInfo);
  }
  
  // Generate the table
  let table = "# Open Ports by Host\n\n";
  
  for (const [hostKey, ports] of hostMap.entries()) {
    const hostInfo = ports[0];
    
    table += `## ${hostKey}\n\n`;
    table += `- IP: ${hostInfo.ip || "Unknown"}\n`;
    table += `- Hostname: ${hostInfo.host_name || "Unknown"}\n\n`;
    
    table += "| Port | Protocol | Service | Description |\n";
    table += "|------|----------|---------|-------------|\n";
    
    for (const port of ports) {
      table += `| ${port.port} | ${port.protocol || "tcp"} | ${port.service || "Unknown"} | ${port.description || ""} |\n`;
    }
    
    table += "\n";
  }
  
  return table;
}

/**
 * Writes the ports table to a file
 * @param outputPath The path to write the file to
 */
export async function writePortsTableToFile(outputPath: string = "./ports-table.md"): Promise<void> {
  try {
    const table = await generatePortsTable();
    
    writeFile(outputPath, table, (err) => {
      if (err) {
        console.error("Error writing ports table to file:", err);
      } else {
        console.log(`Ports table written to ${outputPath}`);
      }
    });
  } catch (error) {
    console.error("Error generating ports table:", error);
  }
}
