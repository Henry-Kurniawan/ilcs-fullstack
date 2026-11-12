import { Router } from "express";
import type { Config } from "../config.ts";
import {
  createGenreAdminController,
  createLaguAdminController,
} from "../admin/controller.ts";
import { createGenreAdminService } from "../admin/genre-service.ts";
import { createLaguAdminService } from "../admin/lagu-service.ts";
import type { Pool } from "../db.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";

export interface AdminRouterDeps {
  pool: Pool;
  config: Config;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
}

export function createAdminRouter({
  pool,
  config,
  authMiddleware,
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

  router.get("/ping", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/lagu", lagu.daftar);
  router.get("/lagu/:id", lagu.detail);
  router.post("/lagu", lagu.tambah);
  router.patch("/lagu/:id", lagu.ubah);
  router.patch("/lagu/:id/tersembunyi", lagu.aturTersembunyi);
  router.delete("/lagu/:id", lagu.hapus);

  router.post("/genre", genre.tambah);
  router.patch("/genre/:id", genre.ubah);
  router.delete("/genre/:id", genre.hapus);

  return router;
}
