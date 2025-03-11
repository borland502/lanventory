import { Command } from "commander";
import { nmapScan } from "../lib/probes/nmap";
import { reverseLookup } from "../lib/probes/dns";
import { IPv4 } from "ip-num";

const program = new Command();

program
  .name("lanventory")
  .description("CLI for network inventory")
  .version("1.0.0");

program
  .command("nmap")
  .description("Run an nmap scan")
  .argument("<ipRange>", "IP range to scan")
  .argument("<outputFilename>", "Output filename for the scan results")
  .action(async (ipRange, outputFilename) => {
    try {
      await nmapScan(ipRange, outputFilename);
      console.log("Nmap scan completed successfully.");
    } catch (error) {
      console.error("Error running nmap scan:", error);
    }
  });

program
  .command("dns")
  .description("Perform a reverse DNS lookup")
  .argument("<ip>", "IP address or comma-separated list of IP addresses")
  .action(async (ip) => {
    try {
      const ipArray = ip.split(",").map((ipStr) => IPv4.fromString(ipStr));
      const hostnames = await reverseLookup(ipArray);
      console.log("Reverse DNS lookup results:", hostnames);
    } catch (error) {
      console.error("Error performing reverse DNS lookup:", error);
    }
  });

program.parse(process.argv);
