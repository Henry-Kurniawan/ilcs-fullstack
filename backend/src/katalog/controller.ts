import { Router } from "express";
import type { Request, Response } from "express";
import { daftarLaguQuerySchema } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import { ambilId } from "../http.ts";
import { pathAudio } from "../media/audio.ts";
import { kirimAudio } from "../media/trial.ts";
import type { KatalogService } from "./service.ts";

export interface KatalogControllerDeps {
  service: KatalogService;
  audioDir: string;
}

export interface KatalogController {
  daftarLagu(req: Request, res: Response): Promise<void>;
  trial(req: Request, res: Response): Promise<void>;
  detail(req: Request, res: Response): Promise<void>;
  daftarGenre(req: Request, res: Response): Promise<void>;
}

export function createKatalogController({
  service,
  audioDir,
}: KatalogControllerDeps): KatalogController {
  return {
    async daftarLagu(req, res) {
      const query = daftarLaguQuerySchema.safeParse(req.query);
      if (!query.success) {
        throw new AppError(
          400,
          "VALIDASI",
          "Parameter daftar Lagu tidak valid.",
        );
      }
      res.json(await service.daftarLagu(query.data));
    },

    async trial(req, res) {
      const id = ambilId(req, "Id Lagu tidak valid.");
      const fileTrial = await service.fileTrial(id);
      if (!fileTrial) {
        throw new AppError(
          404,
          "TIDAK_DITEMUKAN",
          "Trial Lagu tidak ditemukan.",
        );
      }

      const terkirim = await kirimAudio(
        req,
        res,
        pathAudio(audioDir, fileTrial),
      );
      if (!terkirim) {
        throw new AppError(
          404,
          "TIDAK_DITEMUKAN",
          "Trial Lagu tidak ditemukan.",
        );
      }
    },

    async detail(req, res) {
      const id = ambilId(req, "Id Lagu tidak valid.");
      const lagu = await service.detailLagu(id);
      if (!lagu) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }
      res.json({ data: lagu });
    },

    async daftarGenre(_req, res) {
      res.json(await service.daftarGenre());
    },
  };
}

export function katalogRouter(controller: KatalogController) {
  const router = Router();

  router.get("/lagu", controller.daftarLagu);
  router.get("/lagu/:id/trial", controller.trial);
  router.get("/lagu/:id", controller.detail);
  router.get("/genre", controller.daftarGenre);

  return router;
}
