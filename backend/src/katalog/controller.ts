import { Router } from "express";
import { daftarLaguQuerySchema } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import { pathAudio } from "../media/audio.ts";
import { kirimAudio } from "../media/trial.ts";
import {
  ambilDaftarGenre,
  ambilDaftarLagu,
  ambilDetailLagu,
  ambilTrialLagu,
} from "./service.ts";

export interface KatalogDeps {
  audioDir: string;
}

function ambilIdLagu(nilai: string): number {
  const id = Number(nilai);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDASI", "Id Lagu tidak valid.");
  }
  return id;
}

export function katalogRouter(pool: Pool, { audioDir }: KatalogDeps) {
  const router = Router();

  router.get("/lagu", async (req, res) => {
    const query = daftarLaguQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError(
        400,
        "VALIDASI",
        "Parameter daftar Lagu tidak valid.",
      );
    }

    const body = await ambilDaftarLagu(pool, {
      cari: query.data.cari === "" ? undefined : query.data.cari,
      genre: query.data.genre,
      halaman: query.data.halaman,
      ukuran: query.data.ukuran,
    });
    res.json(body);
  });

  router.get("/lagu/:id/trial", async (req, res) => {
    const id = ambilIdLagu(req.params.id);
    const fileTrial = await ambilTrialLagu(pool, id);
    if (!fileTrial) {
      throw new AppError(404, "TIDAK_DITEMUKAN", "Trial Lagu tidak ditemukan.");
    }

    const terkirim = await kirimAudio(
      req,
      res,
      pathAudio(audioDir, fileTrial),
    );
    if (!terkirim) {
      throw new AppError(404, "TIDAK_DITEMUKAN", "Trial Lagu tidak ditemukan.");
    }
  });

  router.get("/lagu/:id", async (req, res) => {
    const id = ambilIdLagu(req.params.id);
    const lagu = await ambilDetailLagu(pool, id);
    if (!lagu) {
      throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
    }
    res.json({ data: lagu });
  });

  router.get("/genre", async (_req, res) => {
    res.json(await ambilDaftarGenre(pool));
  });

  return router;
}
