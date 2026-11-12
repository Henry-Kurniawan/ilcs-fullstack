import { Router } from "express";
import type { Request, Response } from "express";
import { AppError } from "../errors.ts";
import { ambilId, pelangganId } from "../http.ts";
import type { Pool } from "../db.ts";
import { pathAudio } from "../media/audio.ts";
import { kirimAudio } from "../media/trial.ts";
import { contentDispositionUnduhan } from "../media/unduhan.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import { ambilLaguSaya, ambilUnduhan } from "./service.ts";

export interface UnduhanController {
  laguSaya(req: Request, res: Response): Promise<void>;
  unduh(req: Request, res: Response): Promise<void>;
}

export function createUnduhanController({
  pool,
  audioDir,
}: {
  pool: Pool;
  audioDir: string;
}): UnduhanController {
  return {
    async laguSaya(req, res) {
      res.json(await ambilLaguSaya(pool, pelangganId(req)));
    },

    async unduh(req, res) {
      const berkas = await ambilUnduhan(
        pool,
        pelangganId(req),
        ambilId(req, "Id Lagu tidak valid."),
      );
      const terkirim = await kirimAudio(
        req,
        res,
        pathAudio(audioDir, berkas.fileMp3),
        {
          contentDisposition: contentDispositionUnduhan(
            berkas.artis,
            berkas.judul,
          ),
        },
      );
      if (!terkirim) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }
    },
  };
}

export function unduhanRouter(
  controller: UnduhanController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
) {
  const router = Router();
  const pelangganSaja = authMiddleware.requireRole("PELANGGAN");

  router.get("/lagu-saya", pelangganSaja, controller.laguSaya);
  router.get("/lagu/:id/unduh", pelangganSaja, controller.unduh);

  return router;
}
