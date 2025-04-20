import { db } from "@/db";
import { sql } from "drizzle-orm";
import logger from "@/lib/logger";

export async function fixPortsUniqueConstraint() {
  logger.info("Fixing ports table unique constraint...");
  
  try {
    // Drop the existing table
    await db.run(sql`DROP TABLE IF EXISTS ports_backup;`);
    
    // Create a backup of the current table
    await db.run(sql`
      CREATE TABLE ports_backup AS SELECT * FROM ports;
    `);
    
    // Drop the original table
    await db.run(sql`DROP TABLE ports;`);
    
    // Recreate the table with the proper constraint
    await db.run(sql`
      CREATE TABLE ports (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        HOST_ID INTEGER NOT NULL,
        PORT INTEGER NOT NULL,
        PROTOCOL TEXT DEFAULT 'tcp',
        SERVICE TEXT DEFAULT '',
        DESCRIPTION TEXT DEFAULT '',
        DATE TEXT,
        UNIQUE(HOST_ID, PORT, PROTOCOL),
        FOREIGN KEY (HOST_ID) REFERENCES now(ID)
      );
    `);
    
    // Copy the data back
    await db.run(sql`
      INSERT INTO ports SELECT * FROM ports_backup;
    `);
    
    // Create an index for faster lookups
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_ports_host_id ON ports (HOST_ID);
    `);
    
    // Drop the backup table
    await db.run(sql`DROP TABLE ports_backup;`);
    
    logger.info("Ports table unique constraint fixed successfully.");
  } catch (error) {
    logger.error(`Error fixing ports table unique constraint: ${error}`);
    throw error;
  }
}
