const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatRupiah(nilai: number): string {
  return rupiah.format(nilai);
}

export function formatTanggal(iso: string): string {
  return tanggal.format(new Date(`${iso}T00:00:00`));
}
