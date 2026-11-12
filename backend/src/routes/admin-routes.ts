import { Router } from "express";
import type { createAuthMiddleware } from "../middleware/auth.ts";
import type { PelangganController } from "../pelanggan/controller.ts";
import { createAdminPelangganRouter } from "../pelanggan/routes.ts";

export function createAdminRouter(
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
  pelangganController: PelangganController,
): Router {
  const router = Router();
  router.get("/ping", authMiddleware.requireRole("ADMIN"), (_req, res) => {
    res.json({ status: "ok" });
  });
  router.use(
    "/pelanggan",
    createAdminPelangganRouter(pelangganController, authMiddleware),
  );
  return router;
}
