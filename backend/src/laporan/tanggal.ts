/**
 * Batas rentang tanggal Laporan Penjualan dihitung di Asia/Jakarta, bukan zona
 * waktu server. Asia/Jakarta memakai offset tetap +07:00 tanpa DST.
 *
 * `sampai` inklusif: batas atas adalah pukul 00:00 hari berikutnya, eksklusif.
 */
export function batasHariJakarta(
  dari: string,
  sampai: string,
): { awal: Date; akhir: Date } {
  return {
    awal: new Date(`${dari}T00:00:00+07:00`),
    akhir: new Date(`${hariBerikutnya(sampai)}T00:00:00+07:00`),
  };
}

function hariBerikutnya(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const berikutnya = new Date(Date.UTC(tahun, bulan - 1, hari + 1));
  return berikutnya.toISOString().slice(0, 10);
}
