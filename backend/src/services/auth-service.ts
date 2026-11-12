import type { LoginRequest, RegisterRequest } from "@musicpedia/shared";
import type { Akun, AkunDenganPassword } from "../domain/akun.ts";
import { AppError, isUniqueViolation } from "../errors.ts";
import { hashPassword, verifyPassword } from "../password.ts";
import type { AkunRepository } from "../repositories/akun-repository.ts";

const KREDENSIAL_SALAH = new AppError(
  401,
  "KREDENSIAL_SALAH",
  "Email atau kata sandi salah.",
);

function toAkun({ passwordHash: _passwordHash, ...akun }: AkunDenganPassword): Akun {
  return akun;
}

export interface AuthService {
  register(input: RegisterRequest): Promise<Akun>;
  login(input: LoginRequest): Promise<Akun>;
}

export function createAuthService(repo: AkunRepository): AuthService {
  return {
    async register({ email, password }) {
      const passwordHash = await hashPassword(password);
      try {
        return await repo.createPelanggan({ email, passwordHash });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(
            409,
            "EMAIL_TERDAFTAR",
            "Email sudah terdaftar. Silakan masuk.",
          );
        }
        throw error;
      }
    },

    async login({ email, password }) {
      const akun = await repo.findByEmail(email);
      if (!akun) throw KREDENSIAL_SALAH;

      const cocok = await verifyPassword(password, akun.passwordHash);
      if (!cocok) throw KREDENSIAL_SALAH;

      if (!akun.aktif) {
        throw new AppError(
          403,
          "AKUN_NONAKTIF",
          "Akun Anda dinonaktifkan. Hubungi Admin.",
        );
      }

      return toAkun(akun);
    },
  };
}
