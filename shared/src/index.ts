import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("up"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

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

export const galatResponseSchema = z.object({
  pesan: z.string(),
});

export type GalatResponse = z.infer<typeof galatResponseSchema>;
