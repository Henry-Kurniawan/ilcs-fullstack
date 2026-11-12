import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Peran } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import type { AkunRepository } from "../repositories/akun-repository.ts";
import { destroySession } from "../session.ts";

export function createAuthMiddleware(repo: AkunRepository) {
  const muatAkunAktif: RequestHandler = async (req, _res, next) => {
    const akunId = req.session.akunId;
    if (akunId === undefined) {
      next();
      return;
    }

    const akun = await repo.findById(akunId);
    if (!akun || !akun.aktif) {
      await destroySession(req);
      next();
      return;
    }

    req.currentAkun = akun;
    next();
  };

  function requireAuth(req: Request, _res: Response, next: NextFunction) {
    if (!req.currentAkun) {
      next(
        new AppError(
          401,
          "BELUM_MASUK",
          "Silakan masuk terlebih dahulu.",
        ),
      );
      return;
    }
    next();
  }

  function requireRole(peran: Peran) {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.currentAkun) {
        next(new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu."));
        return;
      }
      if (req.currentAkun.peran !== peran) {
        next(new AppError(403, "AKSES_DITOLAK", "Akses ditolak."));
        return;
      }
      next();
    };
  }

  return { muatAkunAktif, requireAuth, requireRole };
}
