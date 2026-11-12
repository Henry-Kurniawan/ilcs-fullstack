import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";

export const NAMA_FIELD_AUDIO = "fileMp3";
export const BATAS_UKURAN_AUDIO = 50 * 1024 * 1024;

export function createUploadAudio(audioDir: string) {
  const tmpDir = path.join(audioDir, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: tmpDir,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: BATAS_UKURAN_AUDIO, files: 1 },
  }).single(NAMA_FIELD_AUDIO);
}
