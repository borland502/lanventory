// Adapter to permit split of the schema into dedicated files
import * as schema from "./schema";
export type { userSchema, userUpdateSchema } from "./schema/users";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "@/env";

export const client = createClient({
  url: env.DATABASE_URL!,
  authToken: env.DB_AUTH_TOKEN!,
});
export const db = drizzle(client, { schema });
