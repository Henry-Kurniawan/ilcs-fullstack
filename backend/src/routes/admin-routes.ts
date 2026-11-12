import { Router } from "express";
import type { Config } from "../config.ts";
import {
  createGenreAdminController,
  createLaguAdminController,
} from "../admin/controller.ts";
import { createGenreAdminService } from "../admin/genre-service.ts";
import { createLaguAdminService } from "../admin/lagu-service.ts";
import type { Pool } from "../db.ts";
import { createLaporanController } from "../laporan/controller.ts";
import { createLaporanService } from "../laporan/service.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { PelangganController } from "../pelanggan/controller.ts";
import { createAdminPelangganRouter } from "../pelanggan/routes.ts";

export interface AdminRouterDeps {
  pool: Pool;
  config: Config;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  pelangganController: PelangganController;
}

export function createAdminRouter({
  pool,
  config,
  authMiddleware,
  pelangganController,
}: AdminRouterDeps): Router {
  const router = Router();
  router.use(authMiddleware.requireRole("ADMIN"));

  const lagu = createLaguAdminController(
    createLaguAdminService({
      pool,
      audioDir: config.audioDir,
      ffmpegPath: config.ffmpegPath,
    }),
    config.audioDir,
  );
  const genre = createGenreAdminController(createGenreAdminService(pool));
  const laporan = createLaporanController(createLaporanService(pool));

  router.use(
    "/pelanggan",
    createAdminPelangganRouter(pelangganController, authMiddleware),
  );

  router.get("/lagu", lagu.daftar);
  router.get("/lagu/:id", lagu.detail);
  router.post("/lagu", lagu.tambah);
  router.patch("/lagu/:id", lagu.ubah);
  router.patch("/lagu/:id/tersembunyi", lagu.aturTersembunyi);
  router.delete("/lagu/:id", lagu.hapus);

  router.post("/genre", genre.tambah);
  router.patch("/genre/:id", genre.ubah);
  router.delete("/genre/:id", genre.hapus);

  router.get("/laporan", laporan.laporan);
  router.get("/laporan/pdf", laporan.pdf);
  router.get("/laporan/excel", laporan.excel);

  return router;
}
