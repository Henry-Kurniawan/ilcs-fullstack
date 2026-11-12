import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

interface Rentang {
  start: number;
  end: number;
}

function parseRentang(header: string, ukuran: number): Rentang | null {
  const cocok = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!cocok) return null;

  const awal = cocok[1] ?? "";
  const akhir = cocok[2] ?? "";
  if (awal === "" && akhir === "") return null;

  if (awal === "") {
    // Rentang sufiks: bytes=-500 berarti 500 byte terakhir.
    const panjang = Number(akhir);
    if (!Number.isInteger(panjang) || panjang <= 0) return null;
    return { start: Math.max(0, ukuran - panjang), end: ukuran - 1 };
  }

  const start = Number(awal);
  if (!Number.isInteger(start) || start < 0 || start >= ukuran) return null;

  const end = akhir === "" ? ukuran - 1 : Number(akhir);
  if (!Number.isInteger(end) || end < start) return null;

  return { start, end: Math.min(end, ukuran - 1) };
}

/**
 * Mengirim berkas audio dengan dukungan HTTP Range. Tidak pernah memasang
 * header Content-Disposition, sehingga Trial hanya bisa diputar, bukan
 * diunduh sebagai lampiran.
 */
export async function kirimAudio(
  req: IncomingMessage,
  res: ServerResponse,
  pathBerkas: string,
): Promise<boolean> {
  let ukuran: number;
  try {
    const info = await stat(pathBerkas);
    if (!info.isFile()) return false;
    ukuran = info.size;
  } catch {
    return false;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  const rentang = req.headers.range
    ? parseRentang(req.headers.range, ukuran)
    : undefined;

  if (req.headers.range && !rentang) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${ukuran}`);
    res.end();
    return true;
  }

  if (!rentang) {
    res.statusCode = 200;
    res.setHeader("Content-Length", String(ukuran));
    createReadStream(pathBerkas).pipe(res);
    return true;
  }

  const panjang = rentang.end - rentang.start + 1;
  res.statusCode = 206;
  res.setHeader("Content-Range", `bytes ${rentang.start}-${rentang.end}/${ukuran}`);
  res.setHeader("Content-Length", String(panjang));
  createReadStream(pathBerkas, {
    start: rentang.start,
    end: rentang.end,
  }).pipe(res);
  return true;
}
