import { Router } from "express";
import type { Request, Response } from "express";
import { AppError } from "../errors.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { PembelianService } from "./service.ts";

export interface PembelianController {
  checkout(req: Request, res: Response): Promise<void>;
  daftar(req: Request, res: Response): Promise<void>;
  lanjutkan(req: Request, res: Response): Promise<void>;
}

function pelangganId(req: Request): number {
  const akun = req.currentAkun;
  if (!akun) {
    throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
  }
  return akun.id;
}

function ambilId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDASI", "Id Pembelian tidak valid.");
  }
  return id;
}

export function createPembelianController({
  service,
}: {
  service: PembelianService;
}): PembelianController {
  return {
    async checkout(req, res) {
      res.status(201).json({ data: await service.checkout(pelangganId(req)) });
    },

    async daftar(req, res) {
      res.json({ data: await service.daftar(pelangganId(req)) });
    },

    async lanjutkan(req, res) {
      res.json({
        data: await service.lanjutkan(pelangganId(req), ambilId(req)),
      });
    },
  };
}

export function pembelianRouter(
  controller: PembelianController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
) {
  const router = Router();
  router.use("/pembelian", authMiddleware.requireRole("PELANGGAN"));

  router.get("/pembelian", controller.daftar);
  router.post("/pembelian", controller.checkout);
  router.post("/pembelian/:id/lanjutkan", controller.lanjutkan);

  return router;
}
