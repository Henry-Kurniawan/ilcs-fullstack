import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const KANDIDAT_DIREKTORI = [
  path.resolve(import.meta.dirname, "../../.tools"),
  "/home/adity/workspace/ilcs-fullstack/.tools",
  "/tmp/opencode/tools",
];

export function cariBiner(nama: "ffmpeg" | "ffprobe"): string {
  const dariEnv =
    nama === "ffmpeg" ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  if (dariEnv) return dariEnv;

  for (const direktori of KANDIDAT_DIREKTORI) {
    const kandidat = path.join(direktori, nama);
    if (existsSync(kandidat)) return kandidat;
  }

  throw new Error(
    `${nama} tidak ditemukan. Set ${nama.toUpperCase()}_PATH ke biner statis.`,
  );
}

/** Membuat berkas mp3 nada sinus asli lewat ffmpeg. */
export async function buatNadaMp3(durasiDetik = 40): Promise<string> {
  const direktori = await mkdtemp(path.join(tmpdir(), "musicpedia-nada-"));
  const berkas = path.join(direktori, "nada.mp3");
  await execFileAsync(cariBiner("ffmpeg"), [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${durasiDetik}`,
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    berkas,
  ]);
  return berkas;
}

/** Membuat berkas yang bukan audio, tetapi diberi nama .mp3. */
export async function buatBerkasBukanAudio(): Promise<string> {
  const direktori = await mkdtemp(path.join(tmpdir(), "musicpedia-palsu-"));
  const berkas = path.join(direktori, "palsu.mp3");
  await writeFile(berkas, "ini bukan audio sama sekali\n");
  return berkas;
}

export async function durasiAudio(pathBerkas: string): Promise<number> {
  const { stdout } = await execFileAsync(cariBiner("ffprobe"), [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    pathBerkas,
  ]);
  return Number(stdout.trim());
}
