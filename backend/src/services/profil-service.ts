import type { UbahPasswordRequest, UpdateProfilRequest } from "@musicpedia/shared";
import type { Akun } from "../domain/akun.ts";
import { AppError } from "../errors.ts";
import { hashPassword, verifyPassword } from "../password.ts";
import type { AkunRepository } from "../repositories/akun-repository.ts";

export interface ProfilService {
  ubahProfil(akunId: number, input: UpdateProfilRequest): Promise<Akun>;
  ubahPassword(akunId: number, input: UbahPasswordRequest): Promise<void>;
}

export function createProfilService(repo: AkunRepository): ProfilService {
  return {
    async ubahProfil(akunId, { nama }) {
      const akun = await repo.updateNama(akunId, nama);
      if (!akun) {
        throw new AppError(404, "AKUN_TIDAK_DITEMUKAN", "Akun tidak ditemukan.");
      }
      return akun;
    },

    async ubahPassword(akunId, { passwordLama, passwordBaru }) {
      const akun = await repo.findByIdWithPassword(akunId);
      if (!akun) {
        throw new AppError(404, "AKUN_TIDAK_DITEMUKAN", "Akun tidak ditemukan.");
      }

      const cocok = await verifyPassword(passwordLama, akun.passwordHash);
      if (!cocok) {
        throw new AppError(
          400,
          "PASSWORD_LAMA_SALAH",
          "Kata sandi lama tidak sesuai.",
        );
      }

      await repo.updatePasswordHash(akunId, await hashPassword(passwordBaru));
    },
  };
}
