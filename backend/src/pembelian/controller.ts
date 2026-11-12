import { Router } from "express";
import type { Request, Response } from "express";
import { ambilId, pelangganId } from "../http.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { PembelianService } from "./service.ts";

export interface PembelianController {
  checkout(req: Request, res: Response): Promise<void>;
  daftar(req: Request, res: Response): Promise<void>;
  lanjutkan(req: Request, res: Response): Promise<void>;
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
        data: await service.lanjutkan(
          pelangganId(req),
          ambilId(req, "Id Pembelian tidak valid."),
        ),
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
