/**
 * Nama berkas Unduhan "Artis - judul.mp3". Karakter kontrol (termasuk CR/LF),
 * tanda kutip, dan pemisah path dibuang agar header Content-Disposition aman.
 * Judul beraksara non-ASCII tetap utuh lewat parameter filename* RFC 5987.
 */
export function namaBerkasUnduhan(artis: string, judul: string): string {
  const nama = `${artis} - ${judul}.mp3`
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/["\\/]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return nama.length > 0 ? nama : "lagu.mp3";
}

function encodeRfc5987(nilai: string): string {
  return encodeURIComponent(nilai).replace(
    /['()*]/g,
    (karakter) => `%${karakter.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function contentDispositionUnduhan(
  artis: string,
  judul: string,
): string {
  const nama = namaBerkasUnduhan(artis, judul);
  const ascii = nama.replace(/[^\x20-\x7e]/g, "_");
  if (ascii === nama) {
    return `attachment; filename="${nama}"`;
  }
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(nama)}`;
}
