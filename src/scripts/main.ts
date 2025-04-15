import { Command } from "commander";
import { networkScan } from "@/lib/probes/nmap";
import { writeHostsToFile } from "@/lib/dump/hosts";

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
      await networkScan(ipRange, 22, 2222);
    } catch (error) {
      console.error("Error running nmap scan:", error);
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
          await writeHostsToFile();
        } catch (error) {
          console.error("Error dumping hosts:", error);
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
