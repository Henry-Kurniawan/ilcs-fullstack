import { Router } from "express";
import type { Request, Response } from "express";
import {
  midtransNotificationSchema,
  type MidtransWebhookResponse,
} from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import type { WebhookService } from "./service.ts";

export interface WebhookController {
  midtrans(req: Request, res: Response): Promise<void>;
}

export function createWebhookController({
  service,
}: {
  service: WebhookService;
}): WebhookController {
  return {
    async midtrans(req, res) {
      const notifikasi = midtransNotificationSchema.safeParse(req.body);
      if (!notifikasi.success) {
        throw new AppError(
          400,
          "VALIDASI",
          "Notifikasi Midtrans tidak valid.",
        );
      }

      await service.terima(notifikasi.data);
      const body: MidtransWebhookResponse = { status: "ok" };
      res.json(body);
    },
  };
}

/**
 * Endpoint publik: Midtrans tidak membawa sesi Pelanggan. Keaslian permintaan
 * dijaga oleh signature, bukan oleh login.
 */
export function webhookRouter(controller: WebhookController) {
  const router = Router();
  router.post("/webhook/midtrans", controller.midtrans);
  return router;
}
