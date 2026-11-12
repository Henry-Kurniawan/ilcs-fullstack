export interface Config {
  port: number;
  databaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = env.PORT ? Number(env.PORT) : 3000;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT tidak valid: ${env.PORT}`);
  }
  return {
    port,
    databaseUrl:
      env.DATABASE_URL ??
      "postgres://musicpedia:musicpedia@localhost:5433/musicpedia",
  };
}
