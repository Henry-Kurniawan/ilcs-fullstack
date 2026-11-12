import { Router } from "express";
import type { AuthController } from "../controllers/auth-controller.ts";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.get("/me", controller.me);
  router.post("/logout", controller.logout);
  return router;
}
