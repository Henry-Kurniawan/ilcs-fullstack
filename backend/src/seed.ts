import pg from "pg";
import type { Akun } from "./domain/akun.ts";
import { hashPassword } from "./password.ts";
import { createAkunRepository } from "./repositories/akun-repository.ts";

export interface AdminSeed {
  email: string;
  password: string;
}

export async function seedAdmin(pool: pg.Pool, { email, password }: AdminSeed): Promise<Akun> {
  const passwordHash = await hashPassword(password);
  return createAkunRepository(pool).upsertAdmin({ email, passwordHash });
}

if (import.meta.main) {
  const { loadConfig } = await import("./config.ts");
  const { migrate } = await import("./migrate.ts");

  const config = loadConfig();
  if (config.nodeEnv === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD wajib diisi saat menjalankan seed di produksi.");
  }

  await migrate(config.databaseUrl, console.log);

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  try {
    const akun = await seedAdmin(pool, {
      email: config.adminEmail,
      password: config.adminPassword,
    });
    console.log(`Admin siap: ${akun.email}`);
  } finally {
    await pool.end();
  }
}
