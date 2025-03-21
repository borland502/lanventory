import { Command } from "commander";
import { networkScan } from "@/lib/probes/nmap";
import { reverseLookup } from "../actions/probes/dns";
import { IPv4, IPv4CidrRange } from "ip-num";
const program = new Command();

program
  .name("lanventory")
  .description("CLI for network inventory")
  .version("1.0.0");

program
  .command("nmap")
  .description("Run an nmap scan using node-nmap-hosts")
  .argument("<ipRange>", "IP range to scan")
  .action(async (ipRange) => {
    try {
      networkScan(ipRange);
    } catch (error) {
      console.error("Error running nmap scan:", error);
    }
  });

// program
//   .command("dns")
//   .description("Perform a reverse DNS lookup")
//   .argument("<ip>", "IP address or comma-separated list of IP addresses")
//   .action(async (ip) => {
//     try {
//       const ipArray = ip.split(",").map((ipStr) => IPv4.fromString(ip));
//       const hostnames = await reverseLookup(ipArray);
//       console.log("Reverse DNS lookup results:", hostnames);
//     } catch (error) {
//       console.error("Error performing reverse DNS lookup:", error);
//     }
//   });

program.parse(process.argv);
