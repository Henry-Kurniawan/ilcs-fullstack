const formatTanggalJakarta = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Tanggal dan waktu bayar dalam zona waktu Asia/Jakarta, mis.
 * "05/11/2026 10:00". Dipakai bersama oleh tabel Laporan Penjualan dan ekspor
 * PDF/Excel agar keduanya menampilkan waktu yang sama.
 */
export function formatTanggalBayarJakarta(iso: string): string {
  const bagian = formatTanggalJakarta.formatToParts(new Date(iso));
  const nilai = (tipe: Intl.DateTimeFormatPartTypes) =>
    bagian.find((item) => item.type === tipe)?.value ?? "";
  return `${nilai("day")}/${nilai("month")}/${nilai("year")} ${nilai("hour")}:${nilai("minute")}`;
}
