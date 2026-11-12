import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// MP3 menambahkan padding encoder beberapa milidetik, jadi target dipotong
// sedikit di bawah 30 detik agar Trial tidak pernah melewati batas 30 detik.
const DURASI_TRIAL_DETIK = "29.9";

export class AudioTidakValidError extends Error {
  constructor() {
    super("File yang diunggah bukan audio mp3 yang valid.");
    this.name = "AudioTidakValidError";
  }
}

export interface HasilAudio {
  fileMp3: string;
  fileTrial: string;
}

export function siapkanDirektoriAudio(audioDir: string): void {
  mkdirSync(path.join(audioDir, "mp3"), { recursive: true });
  mkdirSync(path.join(audioDir, "trial"), { recursive: true });
  mkdirSync(path.join(audioDir, "tmp"), { recursive: true });
}

async function jalankanFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  try {
    await execFileAsync(ffmpegPath, args, {
      timeout: 120_000,
      windowsHide: true,
    });
  } catch {
    throw new AudioTidakValidError();
  }
}

export function pathAudio(audioDir: string, pathRelatif: string): string {
  const akar = path.resolve(audioDir);
  const hasil = path.resolve(akar, pathRelatif);
  if (hasil !== akar && !hasil.startsWith(akar + path.sep)) {
    throw new Error(`Path audio di luar direktori audio: ${pathRelatif}`);
  }
  return hasil;
}

async function adaBerkas(pathBerkas: string): Promise<boolean> {
  try {
    return (await stat(pathBerkas)).size > 0;
  } catch {
    return false;
  }
}

export async function hapusFileAudio(
  audioDir: string,
  pathRelatif: Array<string | null | undefined>,
): Promise<void> {
  await Promise.all(
    pathRelatif
      .filter((item): item is string => Boolean(item))
      .map((item) => rm(pathAudio(audioDir, item), { force: true })),
  );
}

export interface PermintaanAudio {
  ffmpegPath: string;
  audioDir: string;
  sumberPath: string;
}

/**
 * Memvalidasi berkas audio dengan ffmpeg, lalu menghasilkan mp3 penuh dan
 * Trial berdurasi paling lama 30 detik. Penulisan dilakukan langsung ke
 * disk, tidak menampung berkas di memori.
 */
export async function buatFileAudio({
  ffmpegPath,
  audioDir,
  sumberPath,
}: PermintaanAudio): Promise<HasilAudio> {
  const id = randomUUID();
  const fileMp3 = `mp3/${id}.mp3`;
  const fileTrial = `trial/${id}.mp3`;
  const pathMp3 = pathAudio(audioDir, fileMp3);
  const pathTrial = pathAudio(audioDir, fileTrial);

  try {
    await jalankanFfmpeg(ffmpegPath, [
      "-v",
      "error",
      "-y",
      "-i",
      sumberPath,
      "-map",
      "0:a:0",
      "-vn",
      "-c:a",
      "copy",
      "-f",
      "mp3",
      pathMp3,
    ]);

    await jalankanFfmpeg(ffmpegPath, [
      "-v",
      "error",
      "-y",
      "-i",
      pathMp3,
      "-map",
      "0:a:0",
      "-vn",
      "-t",
      DURASI_TRIAL_DETIK,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      pathTrial,
    ]);

    if (!(await adaBerkas(pathMp3)) || !(await adaBerkas(pathTrial))) {
      throw new AudioTidakValidError();
    }

    return { fileMp3, fileTrial };
  } catch (error) {
    await hapusFileAudio(audioDir, [fileMp3, fileTrial]);
    throw error;
  }
}
