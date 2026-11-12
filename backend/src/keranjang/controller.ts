import { Router } from "express";
import type { Request, Response } from "express";
import { tambahKeranjangRequestSchema } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { KeranjangService } from "./service.ts";

export interface KeranjangController {
  lihat(req: Request, res: Response): Promise<void>;
  tambah(req: Request, res: Response): Promise<void>;
  hapus(req: Request, res: Response): Promise<void>;
}

export function createKeranjangController({
  service,
}: {
  service: KeranjangService;
}): KeranjangController {
  function pelangganId(req: Request): number {
    const akun = req.currentAkun;
    if (!akun) {
      throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
    }
    return akun.id;
  }

  return {
    async lihat(req, res) {
      res.json({ data: await service.lihat(pelangganId(req)) });
    },

    async tambah(req, res) {
      const parsed = tambahKeranjangRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDASI", "Data Keranjang tidak valid.");
      }
      const data = await service.tambah(pelangganId(req), parsed.data.laguId);
      res.status(201).json({ data });
    },

    async hapus(req, res) {
      const laguId = Number(req.params.laguId);
      if (!Number.isInteger(laguId) || laguId <= 0) {
        throw new AppError(400, "VALIDASI", "Id Lagu tidak valid.");
      }
      res.json({ data: await service.hapus(pelangganId(req), laguId) });
    },
  };
}

export function keranjangRouter(
  controller: KeranjangController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
) {
  const router = Router();
  router.use("/keranjang", authMiddleware.requireRole("PELANGGAN"));

  router.get("/keranjang", controller.lihat);
  router.post("/keranjang", controller.tambah);
  router.delete("/keranjang/:laguId", controller.hapus);

  return router;
}
