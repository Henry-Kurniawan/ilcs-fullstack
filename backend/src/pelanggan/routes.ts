import { Router } from "express";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { PelangganController } from "./controller.ts";

export function createAdminPelangganRouter(
  controller: PelangganController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
): Router {
  const router = Router();
  const hanyaAdmin = authMiddleware.requireRole("ADMIN");

  router.get("/", hanyaAdmin, controller.daftar);
  router.patch("/:id", hanyaAdmin, controller.ubah);
  router.patch("/:id/aktif", hanyaAdmin, controller.ubahStatus);

  return router;
}
