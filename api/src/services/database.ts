import { Pool } from "pg";

export type DatabaseStatus = {
  configured: boolean;
  healthy: boolean;
};

export function createDatabase(databaseUrl?: string) {
  if (!databaseUrl) return undefined;

  return new Pool({
    connectionString: databaseUrl,
    max: 5,
  });
}

export async function databaseStatus(pool?: Pool): Promise<DatabaseStatus> {
  if (!pool) return { configured: false, healthy: true };

  try {
    await pool.query("select 1");
    return { configured: true, healthy: true };
  } catch {
    return { configured: true, healthy: false };
  }
}
