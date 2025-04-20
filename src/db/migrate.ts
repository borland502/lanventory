import "dotenv/config";
import { db } from "./index";
import logger from "@/lib/logger";
import { addPortsTable } from "./migrations/add-ports-table";
import { fixPortsUniqueConstraint } from "./migrations/fix-ports-unique-constraint";

(async () => {
  try {
    logger.info("Running database migrations...");
    
    // Run migrations in order
    await addPortsTable();
    await fixPortsUniqueConstraint();
    
    logger.info("All migrations completed successfully.");
  } catch (error) {
    logger.error(`Error running migrations: ${error}`);
    process.exit(1);
  }
})();
