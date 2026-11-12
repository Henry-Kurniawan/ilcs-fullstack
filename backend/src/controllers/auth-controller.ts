import type { Request, Response } from "express";
import { loginRequestSchema, registerRequestSchema } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import {
  destroySession,
  regenerateSession,
  saveSession,
  SESSION_COOKIE_NAME,
} from "../session.ts";
import type { AuthService } from "../services/auth-service.ts";

export interface AuthControllerDeps {
  authService: AuthService;
}

async function mulaiSesi(req: Request, akunId: number): Promise<void> {
  await regenerateSession(req);
  req.session.akunId = akunId;
  await saveSession(req);
}

export function createAuthController({ authService }: AuthControllerDeps) {
  return {
    async register(req: Request, res: Response) {
      const parsed = registerRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Data tidak valid.",
        );
      }

      const akun = await authService.register(parsed.data);
      await mulaiSesi(req, akun.id);
      res.status(201).json({ akun });
    },

    async login(req: Request, res: Response) {
      const parsed = loginRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Data tidak valid.",
        );
      }

      const akun = await authService.login(parsed.data);
      await mulaiSesi(req, akun.id);
      res.json({ akun });
    },

    async me(req: Request, res: Response) {
      res.json({ akun: req.currentAkun ?? null });
    },

    async logout(req: Request, res: Response) {
      await destroySession(req);
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      res.status(204).end();
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
