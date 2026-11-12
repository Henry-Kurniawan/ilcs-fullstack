import { errorResponseSchema } from "@musicpedia/shared";

export async function pesanKesalahan(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const parsed = errorResponseSchema.safeParse(body);
    if (parsed.success) return parsed.data.error;
  } catch {
    // badan respons bukan JSON; pakai pesan umum di bawah
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}
