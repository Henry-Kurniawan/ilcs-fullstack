import { Router } from "express";
import type { createAuthMiddleware } from "../middleware/auth.ts";

export function createAdminRouter(
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
): Router {
  const router = Router();
  router.get("/ping", authMiddleware.requireRole("ADMIN"), (_req, res) => {
    res.json({ status: "ok" });
  });
  return router;
}
