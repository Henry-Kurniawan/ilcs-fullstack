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

export const urutanLaguSchema = z.enum(["terbaru", "terlaris"]);

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

export const daftarLaguSayaResponseSchema = z.object({
  data: z.array(laguSchema),
});

export type DaftarLaguSayaResponse = z.infer<
  typeof daftarLaguSayaResponseSchema
>;

export const daftarGenreResponseSchema = z.object({
  data: z.array(genreSchema),
});

export type DaftarGenreResponse = z.infer<typeof daftarGenreResponseSchema>;

export const genreResponseSchema = z.object({
  data: genreSchema,
});

export type GenreResponse = z.infer<typeof genreResponseSchema>;

export const genreInputSchema = z.strictObject({
  nama: z
    .string()
    .trim()
    .min(1, "Nama genre wajib diisi.")
    .max(100, "Nama genre maksimal 100 karakter."),
});

export type GenreInput = z.infer<typeof genreInputSchema>;

const teksWajib = (pesan: string, maksimal = 200) =>
  z.string().trim().min(1, pesan).max(maksimal, `${pesan} terlalu panjang.`);

export const laguInputSchema = z.object({
  judul: teksWajib("Judul wajib diisi."),
  artis: teksWajib("Artis wajib diisi."),
  genreId: z.coerce.number().int().positive("Genre wajib dipilih."),
  pencipta: teksWajib("Pencipta wajib diisi."),
  labelRekaman: teksWajib("Label Rekaman wajib diisi."),
  tanggalRilis: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal rilis tidak valid."),
  harga: z.coerce
    .number()
    .int("Harga harus bilangan bulat.")
    .positive("Harga harus lebih dari 0."),
  tersembunyi: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((nilai) => nilai === true || nilai === "true")
    .optional(),
});

export type LaguInput = z.infer<typeof laguInputSchema>;

export const laguUbahSchema = laguInputSchema.partial();

export type LaguUbah = z.infer<typeof laguUbahSchema>;

export const laguAdminSchema = laguSchema.extend({
  tersembunyi: z.boolean(),
});

export type LaguAdmin = z.infer<typeof laguAdminSchema>;

export const laguAdminResponseSchema = z.object({
  data: laguAdminSchema,
});

export type LaguAdminResponse = z.infer<typeof laguAdminResponseSchema>;

export const daftarLaguAdminQuerySchema = daftarLaguQuerySchema.extend({
  ukuran: z.coerce.number().int().min(1).max(200).default(50),
});

export type DaftarLaguAdminQuery = z.infer<typeof daftarLaguAdminQuerySchema>;

export const daftarLaguAdminResponseSchema = z.object({
  data: z.array(laguAdminSchema),
  meta: metaHalamanSchema,
});

export type DaftarLaguAdminResponse = z.infer<
  typeof daftarLaguAdminResponseSchema
>;

export const tersembunyiLaguRequestSchema = z.strictObject({
  tersembunyi: z.boolean(),
});

export type TersembunyiLaguRequest = z.infer<
  typeof tersembunyiLaguRequestSchema
>;

export const keranjangSchema = z.object({
  items: z.array(laguSchema),
  total: z.number().int().nonnegative(),
  jumlah: z.number().int().nonnegative(),
});

export type Keranjang = z.infer<typeof keranjangSchema>;

export const keranjangResponseSchema = z.object({
  data: keranjangSchema,
});

export type KeranjangResponse = z.infer<typeof keranjangResponseSchema>;

export const tambahKeranjangRequestSchema = z.strictObject({
  laguId: z.number().int().positive(),
});

export type TambahKeranjangRequest = z.infer<
  typeof tambahKeranjangRequestSchema
>;

export const statusPembelianSchema = z.enum([
  "MENUNGGU_PEMBAYARAN",
  "LUNAS",
  "GAGAL",
]);

export type StatusPembelian = z.infer<typeof statusPembelianSchema>;

export const itemPembelianSchema = z.object({
  laguId: z.number().int().positive(),
  judul: z.string().min(1),
  artis: z.string().min(1),
  harga: z.number().int().nonnegative(),
});

export type ItemPembelian = z.infer<typeof itemPembelianSchema>;

export const pembelianSchema = z.object({
  id: z.number().int().positive(),
  kodeOrder: z.string().min(1),
  status: statusPembelianSchema,
  total: z.number().int().nonnegative(),
  dibuatPada: z.string(),
  dibayarPada: z.string().nullable(),
  kedaluwarsaPada: z.string(),
  itemPembelian: z.array(itemPembelianSchema),
});

export type Pembelian = z.infer<typeof pembelianSchema>;

export const pembelianCheckoutSchema = pembelianSchema.extend({
  tokenSnap: z.string().min(1),
});

export type PembelianCheckout = z.infer<typeof pembelianCheckoutSchema>;

export const daftarPembelianResponseSchema = z.object({
  data: z.array(pembelianSchema),
});

export type DaftarPembelianResponse = z.infer<
  typeof daftarPembelianResponseSchema
>;

export const pembelianCheckoutResponseSchema = z.object({
  data: pembelianCheckoutSchema,
});

export type PembelianCheckoutResponse = z.infer<
  typeof pembelianCheckoutResponseSchema
>;

export const midtransNotificationSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.union([z.string(), z.number()]).transform(String),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().nullish(),
});

export type MidtransNotification = z.infer<typeof midtransNotificationSchema>;

export const midtransWebhookResponseSchema = z.object({
  status: z.literal("ok"),
});

export type MidtransWebhookResponse = z.infer<
  typeof midtransWebhookResponseSchema
>;

export const konfigurasiResponseSchema = z.object({
  midtransClientKey: z.string(),
  midtransSnapUrl: z.string().url(),
});

export type KonfigurasiResponse = z.infer<typeof konfigurasiResponseSchema>;

const tanggalLaporanSchema = z.iso.date({ message: "Tanggal tidak valid." });

export const laporanQuerySchema = z
  .strictObject({
    dari: tanggalLaporanSchema,
    sampai: tanggalLaporanSchema,
  })
  .refine((data) => data.dari <= data.sampai, {
    message: "Tanggal awal tidak boleh melewati tanggal akhir.",
    path: ["dari"],
  });

export type LaporanQuery = z.infer<typeof laporanQuerySchema>;

export const barisLaporanSchema = z.object({
  pembelianId: z.number().int().positive(),
  tanggalBayar: z.iso.datetime(),
  judul: z.string().min(1),
  artis: z.string().min(1),
  pelanggan: z.string().min(1),
  harga: z.number().int().nonnegative(),
});

export type BarisLaporan = z.infer<typeof barisLaporanSchema>;

export const laporanResponseSchema = z.object({
  dari: z.iso.date(),
  sampai: z.iso.date(),
  total: z.number().int().nonnegative(),
  data: z.array(barisLaporanSchema),
});

export type LaporanResponse = z.infer<typeof laporanResponseSchema>;
