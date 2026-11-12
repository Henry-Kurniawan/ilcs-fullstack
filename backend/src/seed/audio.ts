import { execFile } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Config } from "../config.ts";
import type { Pool } from "../db.ts";
import { buatFileAudio, siapkanDirektoriAudio } from "../media/audio.ts";
import { LAGU_SEED, slugDemo } from "./katalog.ts";

const execFileAsync = promisify(execFile);

const FREKUENSI_NADA = [261, 294, 330, 349, 392, 440, 494, 523, 587, 659];

async function adaBerkas(pathBerkas: string): Promise<boolean> {
  try {
    return (await stat(pathBerkas)).size > 0;
  } catch {
    return false;
  }
}

async function buatNadaSumber(
  ffmpegPath: string,
  pathKeluaran: string,
  frekuensi: number,
): Promise<void> {
  try {
    await execFileAsync(
      ffmpegPath,
      [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frekuensi}:duration=35`,
        "-ac",
        "1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        pathKeluaran,
      ],
      { timeout: 120_000 },
    );
  } catch (error) {
    throw new Error(
      `ffmpeg tidak dapat dijalankan (FFMPEG_PATH=${ffmpegPath}). ` +
        "Seed Data Demo membutuhkan ffmpeg untuk membuat audio orisinal dan Trial. " +
        "Pasang ffmpeg atau arahkan FFMPEG_PATH ke biner ffmpeg.",
      { cause: error },
    );
  }
}

/**
 * Membuat audio Data Demo yang orisinal (nada sinus sintetis, bukan rekaman
 * pihak lain) dan Trial lewat pipeline ffmpeg yang sama dengan unggahan Admin.
 * Berkas yang sudah ada dan masih tercatat di database dilewati, sehingga
 * seed berulang tidak menumpuk berkas.
 */
export async function seedAudioLagu(pool: Pool, config: Config): Promise<void> {
  siapkanDirektoriAudio(config.audioDir);
  const tmpDir = path.join(config.audioDir, "tmp");
  await mkdir(tmpDir, { recursive: true });

  for (const [indeks, lagu] of LAGU_SEED.entries()) {
    const { rows } = await pool.query<{
      id: number;
      file_mp3: string | null;
      file_trial: string | null;
    }>(
      `SELECT id, file_mp3, file_trial
       FROM lagu
       WHERE judul = $1 AND artis = $2`,
      [lagu.judul, lagu.artis],
    );
    const baris = rows[0];
    if (!baris) {
      throw new Error(
        `Lagu "${lagu.judul}" tidak ditemukan saat menyiapkan audio Data Demo.`,
      );
    }

    const slug = `seed-${slugDemo(lagu.judul)}`;
    const pathMp3 = path.join(config.audioDir, "mp3", `${slug}.mp3`);
    const pathTrial = path.join(config.audioDir, "trial", `${slug}.mp3`);
    const berkasLengkap =
      baris.file_mp3 &&
      baris.file_trial &&
      (await adaBerkas(path.join(config.audioDir, baris.file_mp3))) &&
      (await adaBerkas(path.join(config.audioDir, baris.file_trial)));
    if (berkasLengkap) continue;

    const sumber = path.join(tmpDir, `${slug}.mp3`);
    try {
      await buatNadaSumber(
        config.ffmpegPath,
        sumber,
        FREKUENSI_NADA[indeks % FREKUENSI_NADA.length]!,
      );

      let audio;
      try {
        audio = await buatFileAudio({
          ffmpegPath: config.ffmpegPath,
          audioDir: config.audioDir,
          sumberPath: sumber,
          namaDasar: slug,
        });
      } catch (error) {
        throw new Error(
          `Gagal membuat audio Data Demo untuk "${lagu.judul}". ` +
            `Pastikan ffmpeg tersedia di FFMPEG_PATH=${config.ffmpegPath}.`,
          { cause: error },
        );
      }

      await pool.query(
        "UPDATE lagu SET file_mp3 = $2, file_trial = $3 WHERE id = $1",
        [baris.id, audio.fileMp3, audio.fileTrial],
      );
    } finally {
      await rm(sumber, { force: true });
    }
  }
}
