import { HostInfo } from "node-nmap-hosts";
import { exec } from "child_process";
import { parseString, Parser } from "xml2js";
import logger from "@/lib/logger";
import {
  moveHostsToHistory,
  upsertHosts,
} from "@/app/services/host.data-service";
import { upsertPorts } from "@/app/services/port.data-service";
import { NowInsertSchema, PortsInsertSchema } from "@/db/schema";
import { IPv4CidrRange } from "ip-num";
import { isEmpty } from "radash";
import { db } from "@/db";
import { nowTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface NetworkScanOptions {
  allPorts?: boolean;
}

export async function networkScan(ipRange: string, options?: NetworkScanOptions | number, ...scanPorts: number[]) {
  try {
    // We'll move hosts to history after we've collected all the new host information
    // This prevents foreign key constraint errors when inserting ports
    // await moveHostsToHistory();

    // Handle the case where options is a number (first port)
    let ports: number[] = [];
    let scanAllPorts = false;
    
    if (typeof options === 'number') {
      // Old-style call: networkScan(ipRange, port1, port2, ...)
      ports = [options, ...scanPorts];
    } else {
      // New-style call: networkScan(ipRange, { allPorts: true }, port1, port2, ...)
      scanAllPorts = options?.allPorts || false;
      ports = scanPorts.length > 0 ? scanPorts : [22, 2222];
    }
    
    // If allPorts is true, use port range 1-65535
    if (scanAllPorts) {
      ports = [1, 65535]; // This will be converted to "1-65535" in the nmap command
    }
    
    const ipCidrRange = IPv4CidrRange.fromCidr(ipRange).toRangeSet();

    for (const ip of ipCidrRange) {
      logger.info(`Scanning IP: ${ip.toString()}`);
      logger.info(scanAllPorts ? "Scanning all ports (1-65535)..." : `Scanning ports: ${ports.join(", ")}`);
      
      // For all ports scan, we'll use a port range of 1-65535
      let portsToScan: number[];
      
      if (scanAllPorts) {
        // For all ports scan, we need to format it as "1-65535" for nmap
        // But the node-nmap-hosts package expects an array of numbers
        // So we'll pass a special array that will be joined correctly
        portsToScan = [1, 65535];
        logger.debug("Using port range 1-65535");
      } else {
        portsToScan = ports;
        logger.debug(`Using specific ports: ${portsToScan.join(', ')}`);
      }
      
      // Log the actual command that will be executed
      const portParam = scanAllPorts ? "1-65535" : portsToScan.join(',');
      logger.debug(`nmap command will use port parameter: -p ${portParam}`);
      
      const hostInfo: HostInfo[] = await customRunNmapScan(ip.toString(), scanAllPorts ? "1-65535" : portsToScan.join(','));
      
      // Log the scan results
      if (!isEmpty(hostInfo)) {
        logger.debug(`Scan found ${hostInfo.length} hosts`);
        logger.debug(`First host has ${hostInfo[0]?.ports?.length || 0} ports`);
        if (hostInfo[0]?.ports?.length > 0) {
          logger.debug(`First port is ${hostInfo[0].ports[0].port} (${hostInfo[0].ports[0].state})`);
        }
      }

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
      
      // Get the host ID for the port records
      const savedHost = await db
        .select()
        .from(nowTable)
        .where(eq(nowTable.ip, host.ip || ""))
        .limit(1);
      
      if (savedHost.length > 0) {
        const hostId = savedHost[0].id;
        
        // Store port information
        const portRecords: PortsInsertSchema[] = [];
        
        if (scanAllPorts) {
          // When scanning all ports, use the ports discovered by nmap
          // hostInfo contains information about open ports
          const openPorts = hostInfo[0]?.ports || [];
          
          logger.info(`Found ${openPorts.length} ports for host ${host.ip}`);
          
          for (const portInfo of openPorts) {
            // Only record ports that are open
            if (portInfo.state === 'open') {
              logger.info(`Recording open port ${portInfo.port} (${portInfo.serviceName || 'Unknown service'})`);
              
              const portRecord: PortsInsertSchema = {
                host_id: hostId,
                port: portInfo.port,
                protocol: "tcp",
                service: portInfo.serviceName || getDefaultServiceName(portInfo.port),
                description: getDefaultDescription(portInfo.port),
                date: new Date(),
              };
              
              portRecords.push(portRecord);
            }
          }
        } else {
          // For specific port scans, check which ports are actually open
          const openPorts = hostInfo[0]?.ports || [];
          logger.info(`Found ${openPorts.length} open ports out of ${ports.length} scanned ports for host ${host.ip}`);
          
          // Create records only for ports that are open
          for (const portInfo of openPorts) {
            if (portInfo.state === 'open') {
              logger.info(`Recording open port ${portInfo.port} (${portInfo.serviceName || 'Unknown service'})`);
              
              const portRecord: PortsInsertSchema = {
                host_id: hostId,
                port: portInfo.port,
                protocol: "tcp",
                service: portInfo.serviceName || getDefaultServiceName(portInfo.port),
                description: getDefaultDescription(portInfo.port),
                date: new Date(),
              };
              
              portRecords.push(portRecord);
            }
          }
        }
        
        if (portRecords.length > 0) {
          await upsertPorts(portRecords);
        }
      }
    }
    
    // Now that we've processed all hosts and ports, we can move old hosts to history
    await moveHostsToHistory();
    logger.info("Moved old hosts to history");
  } catch (error) {
    logger.error(`Error running network scan: ${error}`);
  }
}

// Helper function to get default service name based on port number
function getDefaultServiceName(port: number): string {
  const serviceMap: Record<number, string> = {
    22: "SSH",
    2222: "SSH (alt)",
    80: "HTTP",
    443: "HTTPS",
    21: "FTP",
    25: "SMTP",
    110: "POP3",
    143: "IMAP",
    3306: "MySQL",
    5432: "PostgreSQL",
    27017: "MongoDB",
    6379: "Redis",
    8080: "HTTP (alt)",
    8443: "HTTPS (alt)",
  };
  
  return serviceMap[port] || "Unknown";
}

/**
 * Custom implementation of runNmapScan that properly handles port ranges
 * @param target The target IP range or specific IP for the nmap scan
 * @param portList The ports to scan, can be a comma-separated list or a range like "1-65535"
 * @returns A Promise that resolves with a detailed list of host information
 */
async function customRunNmapScan(target: string, portList: string): Promise<HostInfo[]> {
  return new Promise((resolve, reject) => {
    logger.info(`Executing nmap command: nmap -sT -T2 -p ${portList} -sV -oX - ${target}`);
    
    exec(`nmap -sT -T2 -p ${portList} -sV -oX - ${target}`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Execution Error: ${error}`);
        return reject(error);
      }
      
      if (stderr && !stderr.includes("max_parallel_sockets")) {
        logger.error(`Standard Error Output: ${stderr}`);
        return reject(new Error(stderr));
      }
      
      parseString(stdout, { explicitArray: false, ignoreAttrs: false }, (err, result) => {
        if (err) {
          logger.error(`Parsing Error: ${err}`);
          reject(err);
        } else if (!result?.nmaprun?.host) {
          logger.info("No hosts found.");
          resolve([]);
        } else {
          const hosts = Array.isArray(result.nmaprun.host) ? result.nmaprun.host : [result.nmaprun.host];
          
          const hostInfos = hosts.map((host: any) => {
            const addresses = Array.isArray(host.address) ? host.address : [host.address];
            const ipAddress = addresses.find((addr: any) => addr.$.addrtype === "ipv4")?.$.addr;
            const macAddress = addresses.find((addr: any) => addr.$.addrtype === "mac");
            
            return {
              ip: ipAddress,
              mac: macAddress?.$.addr,
              vendor: macAddress?.$.vendor,
              hostname: host.hostnames?.hostname?.$.name,
              ports: (host.ports?.port) 
                ? (Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]).map((port: any) => ({
                    port: parseInt(port.$.portid),
                    state: port.state.$.state,
                    serviceName: port.service?.$.name,
                    serviceProduct: port.service?.$.product
                  }))
                : [],
              os: host.os?.osmatch?.[0]?.$.name
            } as HostInfo;
          });
          
          resolve(hostInfos);
        }
      });
    });
  });
}

// Helper function to get default description based on port number
function getDefaultDescription(port: number): string {
  const descriptionMap: Record<number, string> = {
    22: "Secure Shell",
    2222: "Alternate Secure Shell",
    80: "Web Server",
    443: "Secure Web Server",
    21: "File Transfer Protocol",
    25: "Simple Mail Transfer Protocol",
    110: "Post Office Protocol v3",
    143: "Internet Message Access Protocol",
    3306: "MySQL Database",
    5432: "PostgreSQL Database",
    27017: "MongoDB Database",
    6379: "Redis Key-Value Store",
    8080: "Alternate Web Server",
    8443: "Alternate Secure Web Server",
  };
  
  return descriptionMap[port] || "";
}
