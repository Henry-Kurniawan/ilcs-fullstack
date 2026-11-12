import type {
  DaftarLaguAdminResponse,
  LaguAdmin,
  LaguInput,
  LaguUbah,
} from "@musicpedia/shared";
import type { Pool } from "../db.ts";
import { AppError, isForeignKeyViolation } from "../errors.ts";
import {
  AudioTidakValidError,
  buatFileAudio,
  hapusFileAudio,
  type HasilAudio,
} from "../media/audio.ts";
import {
  ambilBerkasLagu,
  ambilLaguAdmin,
  aturTersembunyi,
  daftarLaguAdmin,
  hapusLagu,
  tambahLagu,
  ubahLagu,
  type PerubahanLagu,
} from "./lagu-repository.ts";

export interface DaftarLaguAdminPermintaan {
  cari?: string;
  genre?: number;
  halaman: number;
  ukuran: number;
}

export interface DependensiLaguAdmin {
  pool: Pool;
  audioDir: string;
  ffmpegPath: string;
}

function keAppErrorAudio(error: unknown): never {
  if (error instanceof AudioTidakValidError) {
    throw new AppError(400, "FILE_TIDAK_VALID", error.message);
  }
  throw error;
}

export function createLaguAdminService({
  pool,
  audioDir,
  ffmpegPath,
}: DependensiLaguAdmin) {
  async function buatAudio(sumberPath: string): Promise<HasilAudio> {
    try {
      return await buatFileAudio({ ffmpegPath, audioDir, sumberPath });
    } catch (error) {
      return keAppErrorAudio(error);
    }
  }

  return {
    async daftar(
      permintaan: DaftarLaguAdminPermintaan,
    ): Promise<DaftarLaguAdminResponse> {
      const offset = (permintaan.halaman - 1) * permintaan.ukuran;
      const { items, total } = await daftarLaguAdmin(pool, {
        cari: permintaan.cari,
        genre: permintaan.genre,
        limit: permintaan.ukuran,
        offset,
      });
      return {
        data: items,
        meta: {
          halaman: permintaan.halaman,
          ukuran: permintaan.ukuran,
          total,
          totalHalaman: Math.ceil(total / permintaan.ukuran),
        },
      };
    },

    async detail(id: number): Promise<LaguAdmin> {
      const lagu = await ambilLaguAdmin(pool, id);
      if (!lagu) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }
      return lagu;
    },

    async tambah(data: LaguInput, sumberPath: string): Promise<LaguAdmin> {
      const audio = await buatAudio(sumberPath);
      try {
        return await tambahLagu(pool, {
          judul: data.judul,
          artis: data.artis,
          genreId: data.genreId,
          pencipta: data.pencipta,
          labelRekaman: data.labelRekaman,
          tanggalRilis: data.tanggalRilis,
          harga: data.harga,
          tersembunyi: data.tersembunyi ?? false,
          fileMp3: audio.fileMp3,
          fileTrial: audio.fileTrial,
        });
      } catch (error) {
        await hapusFileAudio(audioDir, [audio.fileMp3, audio.fileTrial]);
        if (isForeignKeyViolation(error)) {
          throw new AppError(400, "VALIDASI", "Genre tidak ditemukan.");
        }
        throw error;
      }
    },

    async ubah(
      id: number,
      data: LaguUbah,
      sumberPath: string | null,
    ): Promise<LaguAdmin> {
      const lama = await ambilBerkasLagu(pool, id);
      if (!lama) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }

      if (Object.keys(data).length === 0 && !sumberPath) {
        throw new AppError(400, "VALIDASI", "Tidak ada data yang diubah.");
      }

      const audio = sumberPath ? await buatAudio(sumberPath) : null;
      const perubahan: PerubahanLagu = {
        judul: data.judul,
        artis: data.artis,
        genreId: data.genreId,
        pencipta: data.pencipta,
        labelRekaman: data.labelRekaman,
        tanggalRilis: data.tanggalRilis,
        harga: data.harga,
        tersembunyi: data.tersembunyi,
        fileMp3: audio?.fileMp3,
        fileTrial: audio?.fileTrial,
      };

      const hasil = await (async () => {
        try {
          return await ubahLagu(pool, id, perubahan);
        } catch (error) {
          if (audio) {
            await hapusFileAudio(audioDir, [audio.fileMp3, audio.fileTrial]);
          }
          if (isForeignKeyViolation(error)) {
            throw new AppError(400, "VALIDASI", "Genre tidak ditemukan.");
          }
          throw error;
        }
      })();

      if (!hasil) {
        if (audio) {
          await hapusFileAudio(audioDir, [audio.fileMp3, audio.fileTrial]);
        }
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }

      if (audio) {
        await hapusFileAudio(audioDir, [lama.fileMp3, lama.fileTrial]);
      }
      return hasil;
    },

    async aturTersembunyi(
      id: number,
      tersembunyi: boolean,
    ): Promise<LaguAdmin> {
      const lagu = await aturTersembunyi(pool, id, tersembunyi);
      if (!lagu) {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }
      return lagu;
    },

    async hapus(id: number): Promise<void> {
      const berkas = await ambilBerkasLagu(pool, id);
      const hasil = await hapusLagu(pool, id);
      if (hasil === "tidak-ada") {
        throw new AppError(404, "TIDAK_DITEMUKAN", "Lagu tidak ditemukan.");
      }
      if (hasil === "pernah-terjual") {
        throw new AppError(
          409,
          "KONFLIK",
          "Lagu yang pernah terjual tidak bisa dihapus.",
        );
      }
      await hapusFileAudio(audioDir, [berkas?.fileMp3, berkas?.fileTrial]);
    },
  };
}

export type LaguAdminService = ReturnType<typeof createLaguAdminService>;
