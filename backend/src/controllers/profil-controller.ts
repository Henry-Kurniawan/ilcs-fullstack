import type { Request, Response } from "express";
import { updateProfilRequestSchema, ubahPasswordRequestSchema, type Profil } from "@musicpedia/shared";
import type { Akun } from "../domain/akun.ts";
import { AppError } from "../errors.ts";
import type { ProfilService } from "../services/profil-service.ts";

export interface ProfilControllerDeps {
  profilService: ProfilService;
}

export function toProfil({ id, email, nama, telepon }: Akun): Profil {
  return { id, email, nama, telepon };
}

function akunSaatIni(req: Request): Akun {
  const akun = req.currentAkun;
  if (!akun) {
    throw new AppError(401, "BELUM_MASUK", "Silakan masuk terlebih dahulu.");
  }
  return akun;
}

export function createProfilController({ profilService }: ProfilControllerDeps) {
  return {
    async tampilkan(req: Request, res: Response) {
      res.json({ profil: toProfil(akunSaatIni(req)) });
    },

    async ubah(req: Request, res: Response) {
      const parsed = updateProfilRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Data tidak valid.",
        );
      }

      const akun = await profilService.ubahProfil(
        akunSaatIni(req).id,
        parsed.data,
      );
      res.json({ profil: toProfil(akun) });
    },

    async ubahPassword(req: Request, res: Response) {
      const parsed = ubahPasswordRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          parsed.error.issues[0]?.message ?? "Data tidak valid.",
        );
      }

      await profilService.ubahPassword(akunSaatIni(req).id, parsed.data);
      res.status(204).end();
    },
  };
}

export type ProfilController = ReturnType<typeof createProfilController>;
