import pg from "pg";

export type Pool = pg.Pool;
export type Db = pg.PoolClient;

export async function withTransaction<T>(
  pool: Pool,
  work: (db: Db) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      broken = rollbackError as Error;
    }
    throw error;
  } finally {
    client.release(broken);
  }
}
