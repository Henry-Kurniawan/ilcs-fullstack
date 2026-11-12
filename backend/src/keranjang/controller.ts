import { Router } from "express";
import type { Request, Response } from "express";
import { tambahKeranjangRequestSchema } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import { ambilId, pelangganId } from "../http.ts";
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
      const laguId = ambilId(req, "Id Lagu tidak valid.", "laguId");
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
