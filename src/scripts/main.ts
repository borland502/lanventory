import { Command } from "commander";
import { networkScan } from "@/lib/probes/nmap";
import { writePortsTableToFile } from "@/lib/dump/ports";
import logger from "@/lib/logger";

const program = new Command();

program
  .name("lanventory")
  .description("CLI for network inventory")
  .version("1.0.0");

program
  .command("nmap")
  .description("Run an nmap scan using node-nmap-hosts")
  .argument("<ipRange>", "IP range to scan")
  .option("--all-ports", "Scan all ports (1-65535)")
  .option("-p, --ports <ports>", "Comma-separated list of ports to scan", "22,2222")
  .action(async (ipRange, options) => {
    try {
      if (options.allPorts) {
        // Scan all ports
        await networkScan(ipRange, { allPorts: true });
      } else {
        // Scan specific ports
        const ports = options.ports.split(",").map(Number);
        await networkScan(ipRange, ...ports);
      }
    } catch (error) {
      logger.error(`Error running nmap scan: ${error}`);
    }
  });

program
  .command("dump")
  .description("Dump data from database to files")
  .addCommand(
    new Command("hosts")
      .description("Dump hosts to /etc/hosts")
      .action(async () => {
        try {
          // Dynamically import to avoid Bun dependency issues
          const { writeHostsToFile } = await import("@/lib/dump/hosts");
          await writeHostsToFile();
        } catch (error) {
          logger.error(`Error dumping hosts: ${error}`);
        }
      }),
  )
  .addCommand(
    new Command("ports")
      .description("Generate a table of open ports by host")
      .option("-o, --output <path>", "Output file path", "./ports-table.md")
      .action(async (options) => {
        try {
          await writePortsTableToFile(options.output);
        } catch (error) {
          logger.error(`Error generating ports table: ${error}`);
        }
      }),
  );
// ).addCommand(
//   new Command("ssh-config")
//   .description("Dump hosts to ~/.ssh/config")
//   .action(async () => {
//     try {
//       await
//     }
//   })
// );

program.parse(process.argv);
