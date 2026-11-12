import pg from "pg";
import { loadConfig } from "../src/config.ts";
import { migrate } from "../src/migrate.ts";

export const TEST_DB = "musicpedia_test";

export function testDatabaseUrl(): string {
  const url = new URL(loadConfig().databaseUrl);
  url.pathname = `/${TEST_DB}`;
  return url.toString();
}

export default async function setup() {
  const adminUrl = loadConfig().databaseUrl;
  const { hostname } = new URL(adminUrl);
  if (!["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(hostname)) {
    throw new Error(`Menolak mereset database tes di host non-lokal: ${hostname}`);
  }
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
  await migrate(testDatabaseUrl());
}
