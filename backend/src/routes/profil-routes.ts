import { Router } from "express";
import type { ProfilController } from "../controllers/profil-controller.ts";
import type { createAuthMiddleware } from "../middleware/auth.ts";

export function createProfilRouter(
  controller: ProfilController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
): Router {
  const router = Router();
  const hanyaPelanggan = authMiddleware.requireRole("PELANGGAN");
  router.get("/", hanyaPelanggan, controller.tampilkan);
  router.patch("/", hanyaPelanggan, controller.ubah);
  router.patch("/password", hanyaPelanggan, controller.ubahPassword);
  return router;
}
