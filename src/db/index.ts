import { env } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schemas from "./schema";

export const db = drizzle(env.DATABASE_URL!, {
  schema: { ...schemas },
});
