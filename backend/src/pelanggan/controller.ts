import type { Request, Response } from "express";
import {
  daftarPelangganQuerySchema,
  ubahStatusPelangganRequestSchema,
  updatePelangganRequestSchema,
} from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import type { PelangganService } from "./service.ts";

export interface PelangganControllerDeps {
  pelangganService: PelangganService;
}

function idPelanggan(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDASI", "Id Pelanggan tidak valid.");
  }
  return id;
}

function akunAdminId(req: Request): number {
  const akun = req.currentAkun;
  if (!akun) {
    throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
  }
  return akun.id;
}

export function createPelangganController({
  pelangganService,
}: PelangganControllerDeps) {
  return {
    async daftar(req: Request, res: Response) {
      const parsed = daftarPelangganQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Parameter daftar Pelanggan tidak valid.",
        );
      }

      res.json(await pelangganService.daftar(parsed.data));
    },

    async ubah(req: Request, res: Response) {
      const parsed = updatePelangganRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Data Pelanggan tidak valid.",
        );
      }

      const data = await pelangganService.ubah(idPelanggan(req), parsed.data);
      res.json({ data });
    },

    async ubahStatus(req: Request, res: Response) {
      const parsed = ubahStatusPelangganRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Status Pelanggan tidak valid.",
        );
      }

      const data = await pelangganService.ubahStatus(
        akunAdminId(req),
        idPelanggan(req),
        parsed.data.aktif,
      );
      res.json({ data });
    },
  };
}

export type PelangganController = ReturnType<typeof createPelangganController>;
