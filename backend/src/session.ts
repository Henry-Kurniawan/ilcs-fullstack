import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import type { Request, RequestHandler } from "express";
import type { Config } from "./config.ts";
import type { Pool } from "./db.ts";

export const SESSION_COOKIE_NAME = "musicpedia.sid";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

export function createSessionMiddleware(
  pool: Pool,
  config: Config,
): RequestHandler {
  const PgSession = connectPgSimple(session);
  const store = new PgSession({
    pool,
    tableName: "sesi",
    createTableIfMissing: false,
    ttl: SESSION_TTL_SECONDS,
  });

  return session({
    name: SESSION_COOKIE_NAME,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    },
  });
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

export function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}
