import "dotenv/config";
import migrate from "drizzle-orm/migrator";
import { db } from "./index";

(async () => {
  await migrate(db, { migrationsFolder: "./migrations" });
})();
