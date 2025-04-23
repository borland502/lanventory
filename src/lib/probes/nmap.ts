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

export async function networkScan(
  ipRange: string,
  options?: NetworkScanOptions | number,
  ...scanPorts: number[]
) {
  try {
    await moveHostsToHistory();
    logger.info("Moved old hosts to history");

    // Handle the case where options is a number (first port)
    let ports: number[] = [];
    let scanAllPorts = false;

    if (typeof options === "number") {
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
      logger.info(
        scanAllPorts
          ? "Scanning all ports (1-65535)..."
          : `Scanning ports: ${ports.join(", ")}`,
      );

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
        logger.debug(`Using specific ports: ${portsToScan.join(", ")}`);
      }

      // Log the actual command that will be executed
      const portParam = scanAllPorts ? "1-65535" : portsToScan.join(",");
      logger.debug(`nmap command will use port parameter: -p ${portParam}`);

      const hostInfo: HostInfo[] = await customRunNmapScan(
        ip.toString(),
        scanAllPorts ? "1-65535" : portsToScan.join(","),
      );

      // Log the scan results
      if (!isEmpty(hostInfo)) {
        logger.debug(`Scan found ${hostInfo.length} hosts`);
        logger.debug(`First host has ${hostInfo[0]?.ports?.length || 0} ports`);
        if (hostInfo[0]?.ports?.length > 0) {
          logger.debug(
            `First port is ${hostInfo[0].ports[0].port} (${hostInfo[0].ports[0].state})`,
          );
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
            if (portInfo.state === "open") {
              logger.info(
                `Recording open port ${portInfo.port} (${portInfo.serviceName || "Unknown service"})`,
              );

              const portRecord: PortsInsertSchema = {
                host_id: hostId,
                port: portInfo.port,
                protocol: "tcp",
                service:
                  portInfo.serviceName || getDefaultServiceName(portInfo.port),
                description: getDefaultDescription(portInfo.port),
                date: new Date(),
              };

              portRecords.push(portRecord);
            }
          }
        } else {
          // For specific port scans, check which ports are actually open
          const openPorts = hostInfo[0]?.ports || [];
          logger.info(
            `Found ${openPorts.length} open ports out of ${ports.length} scanned ports for host ${host.ip}`,
          );

          // Create records only for ports that are open
          for (const portInfo of openPorts) {
            if (portInfo.state === "open") {
              logger.info(
                `Recording open port ${portInfo.port} (${portInfo.serviceName || "Unknown service"})`,
              );

              const portRecord: PortsInsertSchema = {
                host_id: hostId,
                port: portInfo.port,
                protocol: "tcp",
                service:
                  portInfo.serviceName || getDefaultServiceName(portInfo.port),
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
  } catch (error) {
    logger.error(`Error running network scan: ${error}`);
  }
}

// Helper function to get default service name based on port number
function getDefaultServiceName(port: number): string {
  const serviceMap: Record<number, string> = {
    1: "TCP Port Service Multiplexer (TCPMUX)",
    5: "Remote Job Entry (RJE)",
    7: "Echo Protocol",
    9: "Discard Protocol",
    11: "Active Users",
    13: "Daytime Protocol",
    17: "Quote of the Day (QOTD)",
    18: "Message Send Protocol (MSP)",
    19: "Character Generator Protocol (CHARGEN)",
    20: "File Transfer Protocol (FTP) - Data",
    21: "File Transfer Protocol (FTP) - Control",
    22: "SSH",
    23: "Telnet Protocol",
    25: "SMTP",
    37: "Time Protocol",
    42: "Name Server Protocol",
    43: "WHOIS Protocol",
    49: "TACACS+ Authentication",
    53: "Domain Name System (DNS)",
    67: "Bootstrap Protocol (BOOTP) Server",
    68: "Bootstrap Protocol (BOOTP) Client",
    69: "Trivial File Transfer Protocol (TFTP)",
    70: "Gopher Protocol",
    79: "Finger Protocol",
    80: "HTTP",
    88: "Kerberos",
    108: "SNA Gateway Access Protocol",
    109: "Post Office Protocol v2 (POP2)",
    110: "POP3",
    115: "Simple File Transfer Protocol (SFTP)",
    118: "SQL Services",
    119: "Network News Transfer Protocol (NNTP)",
    123: "Network Time Protocol (NTP)",
    135: "Microsoft EPMAP (Endpoint Mapper)",
    137: "NetBIOS Name Service",
    138: "NetBIOS Datagram Service",
    139: "NetBIOS Session Service",
    143: "IMAP",
    161: "Simple Network Management Protocol (SNMP)",
    162: "SNMP Trap",
    179: "Border Gateway Protocol (BGP)",
    194: "Internet Relay Chat (IRC)",
    201: "AppleTalk Routing Maintenance",
    213: "Internetwork Packet Exchange (IPX)",
    220: "IMAP v3",
    389: "Lightweight Directory Access Protocol (LDAP)",
    443: "HTTPS",
    445: "Microsoft-DS SMB",
    465: "SMTPS (SMTP over TLS/SSL)",
    500: "Internet Security Association and Key Management Protocol (ISAKMP)",
    546: "DHCPv6 Client",
    547: "DHCPv6 Server",
    554: "Real Time Streaming Protocol (RTSP)",
    587: "Message Submission Agent (MSA)",
    631: "Internet Printing Protocol (IPP)",
    646: "Label Distribution Protocol (LDP)",
    993: "IMAPS (IMAP over TLS/SSL)",
    995: "POP3S (POP3 over TLS/SSL)",
    1025: "Microsoft Operations Manager (MOM)",
    1080: "SOCKS Proxy",
    1194: "OpenVPN",
    1352: "Lotus Notes",
    1433: "Microsoft SQL Server",
    1521: "Oracle Database",
    1723: "Point-to-Point Tunneling Protocol (PPTP)",
    1755: "Windows Media Services",
    1812: "RADIUS Authentication",
    1813: "RADIUS Accounting",
    2049: "Network File System (NFS)",
    2100: "Wireless Application Protocol (WAP)",
    2102: "Wireless Application Protocol (WAP)",
    2103: "Wireless Application Protocol (WAP)",
    2222: "SSH (alt)",
    3306: "MySQL",
    3389: "Remote Desktop Protocol (RDP)",
    5000: "Universal Plug and Play (UPnP)",
    5060: "Session Initiation Protocol (SIP)",
    5061: "Session Initiation Protocol (SIP) over TLS",
    5353: "Multicast DNS (mDNS)",
    5432: "PostgreSQL",
    5900: "Virtual Network Computing (VNC)",
    6000: "X Window System",
    6379: "Redis",
    8000: "HTTP Alternate",
    8008: "HTTP Alternate",
    8080: "HTTP (alt)",
    8088: "HTTP Alternate",
    8443: "HTTPS (alt)",
    8888: "HTTP Alternate",
    9000: "HTTP Alternate",
    9090: "HTTP Alternate",
    9100: "HP JetDirect",
    9418: "Git",
    10000: "Webmin",
    27017: "MongoDB",
    32400: "Plex Media Server",
    50000: "HTTP Alternate",
    50001: "HTTP Alternate",
    50002: "HTTP Alternate",
    50003: "HTTP Alternate",
    65535: "Reserved",
  };

  return serviceMap[port] || "Unknown";
}

/**
 * Custom implementation of runNmapScan that properly handles port ranges
 * @param target The target IP range or specific IP for the nmap scan
 * @param portList The ports to scan, can be a comma-separated list or a range like "1-65535"
 * @returns A Promise that resolves with a detailed list of host information
 */
async function customRunNmapScan(
  target: string,
  portList: string,
): Promise<HostInfo[]> {
  return new Promise((resolve, reject) => {
    logger.info(
      `Executing nmap command: nmap -sT -T2 -p ${portList} -sV -oX - ${target}`,
    );

    exec(
      `nmap -sT -T2 -p ${portList} -sV -oX - ${target}`,
      (error, stdout, stderr) => {
        if (error) {
          logger.error(`Execution Error: ${error}`);
          return reject(error);
        }

        if (stderr && !stderr.includes("max_parallel_sockets")) {
          logger.error(`Standard Error Output: ${stderr}`);
          return reject(new Error(stderr));
        }

        interface NmapAddress {
          $: {
            addr: string;
            addrtype: string;
            vendor?: string;
          };
        }

        interface NmapHostname {
          $: {
            name: string;
          };
        }

        interface NmapPort {
          $: {
            portid: string;
          };
          state: {
            $: {
              state: string;
            };
          };
          service?: {
            $: {
              name?: string;
              product?: string;
            };
          };
        }

        interface NmapHost {
          address: NmapAddress | NmapAddress[];
          hostnames?: {
            hostname?: NmapHostname | NmapHostname[];
          };
          ports?: {
            port?: NmapPort | NmapPort[];
          };
          os?: {
            osmatch?: [{ $: { name: string } }];
          };
        }

        interface NmapRun {
          host: NmapHost | NmapHost[];
        }

        interface NmapResult {
          nmaprun?: NmapRun;
        }

        parseString(
          stdout,
          { explicitArray: false, ignoreAttrs: false },
          (err: Error | null, result: NmapResult | undefined) => {
            if (err) {
              logger.error(`Parsing Error: ${err}`);
              reject(err);
            } else if (!result?.nmaprun?.host) {
              logger.info("No hosts found.");
              resolve([]);
            } else {
              const hosts = Array.isArray(result.nmaprun.host)
                ? result.nmaprun.host
                : [result.nmaprun.host];

              const hostInfos = hosts.map((host: NmapHost) => {
                const addresses = Array.isArray(host.address)
                  ? host.address
                  : [host.address];
                const ipAddress = (addresses as NmapAddress[]).find(
                  (addr: NmapAddress) => addr.$.addrtype === "ipv4",
                )?.$.addr;
                const macAddress = (addresses as NmapAddress[]).find(
                  (addr: NmapAddress) => addr.$.addrtype === "mac",
                );

                return {
                  ip: ipAddress,
                  mac: macAddress?.$.addr,
                  vendor: macAddress?.$.vendor,
                  hostname: (
                    host.hostnames?.hostname as NmapHostname[] | NmapHostname
                  )?.$.name,
                  ports: host.ports?.port
                    ? (Array.isArray(host.ports.port)
                        ? host.ports.port
                        : [host.ports.port]
                      ).map((port: NmapPort) => ({
                        port: parseInt(port.$.portid),
                        state: port.state.$.state,
                        serviceName: port.service?.$.name,
                        serviceProduct: port.service?.$.product,
                      }))
                    : [],
                  os: host.os?.osmatch?.[0]?.$.name,
                } as HostInfo;
              });

              resolve(hostInfos);
            }
          },
        );
      },
    );
  });
}

// Helper function to get default description based on port number
function getDefaultDescription(port: number): string {
  const descriptionMap: Record<number, string> = {
    1: "TCP Port Service Multiplexer (TCPMUX)",
    5: "Remote Job Entry (RJE)",
    7: "Echo Protocol",
    9: "Discard Protocol",
    11: "Active Users",
    13: "Daytime Protocol",
    17: "Quote of the Day (QOTD)",
    18: "Message Send Protocol (MSP)",
    19: "Character Generator Protocol (CHARGEN)",
    20: "File Transfer Protocol (FTP) - Data",
    21: "File Transfer Protocol (FTP) - Control",
    22: "Secure Shell (SSH)",
    23: "Telnet Protocol",
    25: "Simple Mail Transfer Protocol (SMTP)",
    37: "Time Protocol",
    42: "Name Server Protocol",
    43: "WHOIS Protocol",
    49: "TACACS+ Authentication",
    53: "Domain Name System (DNS)",
    67: "Bootstrap Protocol (BOOTP) Server",
    68: "Bootstrap Protocol (BOOTP) Client",
    69: "Trivial File Transfer Protocol (TFTP)",
    70: "Gopher Protocol",
    79: "Finger Protocol",
    80: "Hypertext Transfer Protocol (HTTP)",
    88: "Kerberos Authentication System",
    108: "SNA Gateway Access Protocol",
    109: "Post Office Protocol v2 (POP2)",
    110: "Post Office Protocol v3 (POP3)",
    115: "Simple File Transfer Protocol (SFTP)",
    118: "SQL Services",
    119: "Network News Transfer Protocol (NNTP)",
    123: "Network Time Protocol (NTP)",
    135: "Microsoft EPMAP (Endpoint Mapper)",
    137: "NetBIOS Name Service",
    138: "NetBIOS Datagram Service",
    139: "NetBIOS Session Service",
    143: "Internet Message Access Protocol (IMAP)",
    161: "Simple Network Management Protocol (SNMP)",
    162: "SNMP Trap",
    179: "Border Gateway Protocol (BGP)",
    194: "Internet Relay Chat (IRC)",
    201: "AppleTalk Routing Maintenance",
    213: "Internetwork Packet Exchange (IPX)",
    220: "IMAP v3",
    389: "Lightweight Directory Access Protocol (LDAP)",
    443: "Hypertext Transfer Protocol Secure (HTTPS)",
    445: "Microsoft-DS SMB",
    465: "SMTPS (SMTP over TLS/SSL)",
    500: "Internet Security Association and Key Management Protocol (ISAKMP)",
    546: "DHCPv6 Client",
    547: "DHCPv6 Server",
    554: "Real Time Streaming Protocol (RTSP)",
    587: "Message Submission Agent (MSA)",
    631: "Internet Printing Protocol (IPP)",
    646: "Label Distribution Protocol (LDP)",
    993: "IMAPS (IMAP over TLS/SSL)",
    995: "POP3S (POP3 over TLS/SSL)",
    1025: "Microsoft Operations Manager (MOM)",
    1080: "SOCKS Proxy",
    1194: "OpenVPN",
    1352: "Lotus Notes",
    1433: "Microsoft SQL Server",
    1521: "Oracle Database",
    1723: "Point-to-Point Tunneling Protocol (PPTP)",
    1755: "Windows Media Services",
    1812: "RADIUS Authentication",
    1813: "RADIUS Accounting",
    2049: "Network File System (NFS)",
    2100: "Wireless Application Protocol (WAP)",
    2102: "Wireless Application Protocol (WAP)",
    2103: "Wireless Application Protocol (WAP)",
    2222: "Alternate Secure Shell (SSH)",
    3306: "MySQL Database",
    3389: "Remote Desktop Protocol (RDP)",
    5000: "Universal Plug and Play (UPnP)",
    5060: "Session Initiation Protocol (SIP)",
    5061: "Session Initiation Protocol (SIP) over TLS",
    5353: "Multicast DNS (mDNS)",
    5432: "PostgreSQL Database",
    5900: "Virtual Network Computing (VNC)",
    6000: "X Window System",
    6379: "Redis Key-Value Store",
    8000: "HTTP Alternate",
    8008: "HTTP Alternate",
    8080: "Alternate HTTP Port",
    8088: "HTTP Alternate",
    8443: "Alternate HTTPS Port",
    8888: "HTTP Alternate",
    9000: "HTTP Alternate",
    9090: "HTTP Alternate",
    9100: "HP JetDirect",
    9418: "Git Version Control System",
    10000: "Webmin",
    27017: "MongoDB Database",
    32400: "Plex Media Server",
    50000: "HTTP Alternate",
    50001: "HTTP Alternate",
    50002: "HTTP Alternate",
    50003: "HTTP Alternate",
    65535: "Reserved",
  };

  return descriptionMap[port] || "";
}
