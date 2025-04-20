import { db } from "@/db";
import { sql } from "drizzle-orm";
import logger from "@/lib/logger";

export async function addPortsTable() {
  logger.info("Creating ports table...");
  
  try {
    // Create the ports table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ports (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        HOST_ID INTEGER NOT NULL,
        PORT INTEGER NOT NULL,
        PROTOCOL TEXT DEFAULT 'tcp',
        SERVICE TEXT DEFAULT '',
        DESCRIPTION TEXT DEFAULT '',
        DATE TEXT,
        FOREIGN KEY (HOST_ID) REFERENCES now(ID)
      );
    `);
    
    // Create an index for faster lookups
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_ports_host_id ON ports (HOST_ID);
    `);
    
    // Create a unique constraint to prevent duplicates
    await db.run(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ports_unique ON ports (HOST_ID, PORT, PROTOCOL);
    `);
    
    logger.info("Ports table created successfully.");
  } catch (error) {
    logger.error(`Error creating ports table: ${error}`);
    throw error;
  }
}
