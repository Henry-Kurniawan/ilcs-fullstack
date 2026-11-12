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

export const genreSchema = z.object({
  id: z.number().int().positive(),
  nama: z.string().min(1),
});

export type Genre = z.infer<typeof genreSchema>;

export const laguSchema = z.object({
  id: z.number().int().positive(),
  judul: z.string().min(1),
  artis: z.string().min(1),
  genre: genreSchema,
  pencipta: z.string().min(1),
  labelRekaman: z.string().min(1),
  tanggalRilis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  harga: z.number().int().positive(),
});

export type Lagu = z.infer<typeof laguSchema>;

export const urutanLaguSchema = z.enum(["terbaru"]);

export type UrutanLagu = z.infer<typeof urutanLaguSchema>;

export const daftarLaguQuerySchema = z.object({
  cari: z.string().trim().optional(),
  genre: z.coerce.number().int().positive().optional(),
  urutan: urutanLaguSchema.default("terbaru"),
  halaman: z.coerce.number().int().min(1).default(1),
  ukuran: z.coerce.number().int().min(1).max(100).default(12),
});

export type DaftarLaguQuery = z.infer<typeof daftarLaguQuerySchema>;

export const metaHalamanSchema = z.object({
  halaman: z.number().int().positive(),
  ukuran: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalHalaman: z.number().int().nonnegative(),
});

export type MetaHalaman = z.infer<typeof metaHalamanSchema>;

export const pelangganSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  nama: z.string(),
  aktif: z.boolean(),
});

export type Pelanggan = z.infer<typeof pelangganSchema>;

export const daftarPelangganQuerySchema = z.object({
  cari: z.string().trim().optional(),
  halaman: z.coerce.number().int().min(1).default(1),
  ukuran: z.coerce.number().int().min(1).max(100).default(20),
});

export type DaftarPelangganQuery = z.infer<typeof daftarPelangganQuerySchema>;

export const daftarPelangganResponseSchema = z.object({
  data: z.array(pelangganSchema),
  meta: metaHalamanSchema,
});

export type DaftarPelangganResponse = z.infer<
  typeof daftarPelangganResponseSchema
>;

export const updatePelangganRequestSchema = z
  .strictObject({
    nama: namaSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.nama !== undefined || data.email !== undefined, {
    message: "Isi minimal nama atau email Pelanggan.",
  });

export type UpdatePelangganRequest = z.infer<
  typeof updatePelangganRequestSchema
>;

export const ubahStatusPelangganRequestSchema = z.strictObject({
  aktif: z.boolean({ message: "Status aktif wajib diisi." }),
});

export type UbahStatusPelangganRequest = z.infer<
  typeof ubahStatusPelangganRequestSchema
>;

export const pelangganResponseSchema = z.object({
  data: pelangganSchema,
});

export type PelangganResponse = z.infer<typeof pelangganResponseSchema>;

export const daftarLaguResponseSchema = z.object({
  data: z.array(laguSchema),
  meta: metaHalamanSchema,
});

export type DaftarLaguResponse = z.infer<typeof daftarLaguResponseSchema>;

export const laguResponseSchema = z.object({
  data: laguSchema,
});

export type LaguResponse = z.infer<typeof laguResponseSchema>;

export const daftarGenreResponseSchema = z.object({
  data: z.array(genreSchema),
});

export type DaftarGenreResponse = z.infer<typeof daftarGenreResponseSchema>;
