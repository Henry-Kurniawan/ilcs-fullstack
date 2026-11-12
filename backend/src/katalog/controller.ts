import { Router } from "express";
import { daftarLaguQuerySchema } from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError } from "../errors.ts";
import {
  ambilDaftarGenre,
  ambilDaftarLagu,
  ambilDetailLagu,
} from "./service.ts";

export function katalogRouter(pool: Pool) {
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

  router.get("/lagu/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, "VALIDASI", "Id Lagu tidak valid.");
    }

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
