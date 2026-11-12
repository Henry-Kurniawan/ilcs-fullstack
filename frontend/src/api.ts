import type { z } from "zod";
import { errorResponseSchema } from "@musicpedia/shared";

/** Kesalahan HTTP yang membawa pesan berbahasa Indonesia dari server. */
export class KesalahanApi extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "KesalahanApi";
    this.status = status;
    this.code = code;
  }
}

async function bacaKesalahan(
  res: Response,
): Promise<{ code: string; pesan: string }> {
  try {
    const body: unknown = await res.json();
    const parsed = errorResponseSchema.safeParse(body);
    if (parsed.success) {
      return { code: parsed.data.code, pesan: parsed.data.error };
    }
  } catch {
    // badan respons bukan JSON; pakai pesan umum di bawah
  }
  return {
    code: "KESALAHAN_SERVER",
    pesan: "Terjadi kesalahan. Silakan coba lagi.",
  };
}

/**
 * `fetch` dengan pemeriksaan `res.ok`. Respons gagal diubah menjadi
 * `KesalahanApi` yang membawa kode dan pesan Indonesia dari server.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const { code, pesan } = await bacaKesalahan(res);
    throw new KesalahanApi(res.status, code, pesan);
  }
  return res;
}

/** `apiFetch` sekaligus memvalidasi badan JSON dengan skema zod `shared`. */
export async function apiJson<S extends z.ZodType>(
  path: string,
  schema: S,
  init?: RequestInit,
): Promise<z.output<S>> {
  const res = await apiFetch(path, init);
  return schema.parse(await res.json());
}

/**
 * Pesan untuk ditampilkan dari sebuah kegagalan: pesan server bila ada,
 * selain itu pesan cadangan milik pemanggil (mis. gangguan jaringan).
 */
export function pesanDariError(error: unknown, cadangan: string): string {
  return error instanceof KesalahanApi ? error.message : cadangan;
}
