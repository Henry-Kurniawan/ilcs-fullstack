import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("up"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const peranSchema = z.enum(["PELANGGAN", "ADMIN"]);

export type Peran = z.infer<typeof peranSchema>;

export const profilSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  nama: z.string(),
});

export type Profil = z.infer<typeof profilSchema>;

export const akunSchema = profilSchema.extend({
  peran: peranSchema,
  aktif: z.boolean(),
});

export type Akun = z.infer<typeof akunSchema>;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Email tidak valid." }));

const passwordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

const namaSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi.")
  .max(100, "Nama maksimal 100 karakter.");

export const registerRequestSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const akunResponseSchema = z.object({
  akun: akunSchema,
});

export type AkunResponse = z.infer<typeof akunResponseSchema>;

export const meResponseSchema = z.object({
  akun: akunSchema.nullable(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

export const profilResponseSchema = z.object({
  profil: profilSchema,
});

export type ProfilResponse = z.infer<typeof profilResponseSchema>;

export const updateProfilRequestSchema = z.strictObject({
  nama: namaSchema,
});

export type UpdateProfilRequest = z.infer<typeof updateProfilRequestSchema>;

export const ubahPasswordRequestSchema = z.strictObject({
  passwordLama: z.string().min(1, "Kata sandi lama wajib diisi."),
  passwordBaru: passwordSchema,
});

export type UbahPasswordRequest = z.infer<typeof ubahPasswordRequestSchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
