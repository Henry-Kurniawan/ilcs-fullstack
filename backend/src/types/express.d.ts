import "express-session";
import type { Akun } from "../domain/akun.ts";

declare module "express-session" {
  interface SessionData {
    akunId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      currentAkun?: Akun;
    }
  }
}
