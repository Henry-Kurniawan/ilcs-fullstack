import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { LaporanResponse } from "@musicpedia/shared";
import { formatTanggalBayarJakarta } from "@musicpedia/shared";

const formatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatTanggalPeriode(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split("-");
  return `${hari}/${bulan}/${tahun}`;
}

export function namaBerkasLaporan(
  dari: string,
  sampai: string,
  ekstensi: "pdf" | "xlsx",
): string {
  return `laporan-penjualan-${dari}_${sampai}.${ekstensi}`;
}

const KOLOM = [
  { judul: "Tanggal Bayar", lebar: 88 },
  { judul: "Lagu", lebar: 108 },
  { judul: "Artis", lebar: 84 },
  { judul: "Pelanggan", lebar: 90 },
  { judul: "Harga", lebar: 72, rataKanan: true },
  { judul: "Total", lebar: 73, rataKanan: true },
] as const;

const LEBAR_TABEL = KOLOM.reduce((jumlah, kolom) => jumlah + kolom.lebar, 0);
const MARGIN = 40;

function gambarHeaderTabel(doc: PDFKit.PDFDocument): void {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  let x = MARGIN;
  for (const kolom of KOLOM) {
    doc.text(kolom.judul, x, y, {
      width: kolom.lebar - 6,
      align: "rataKanan" in kolom ? "right" : "left",
      lineBreak: false,
    });
    x += kolom.lebar;
  }
  doc
    .moveTo(MARGIN, y + 14)
    .lineTo(MARGIN + LEBAR_TABEL, y + 14)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.y = y + 19;
}

function barisBaru(doc: PDFKit.PDFDocument): void {
  if (doc.y > 740) {
    doc.addPage();
    doc.y = MARGIN;
    gambarHeaderTabel(doc);
  }
}

export async function buatPdfLaporan(
  laporan: LaporanResponse,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: { Title: "Laporan Penjualan" },
  });
  const potongan: Buffer[] = [];
  const selesai = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (bagian: Buffer) => potongan.push(bagian));
    doc.on("end", () => resolve(Buffer.concat(potongan)));
    doc.on("error", reject);
  });

  doc.font("Helvetica-Bold").fontSize(18).text("Laporan Penjualan");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#475569")
    .text(
      `Periode: ${formatTanggalPeriode(laporan.dari)} - ${formatTanggalPeriode(laporan.sampai)}`,
    );
  doc.fillColor("#111827");
  doc.moveDown(1);
  gambarHeaderTabel(doc);

  doc.font("Helvetica").fontSize(9);
  for (const baris of laporan.data) {
    barisBaru(doc);
    const y = doc.y;
    const nilai = [
      formatTanggalBayarJakarta(baris.tanggalBayar),
      baris.judul,
      baris.artis,
      baris.pelanggan,
      formatRupiah.format(baris.harga),
      formatRupiah.format(baris.total),
    ];
    let x = MARGIN;
    for (const [indeks, kolom] of KOLOM.entries()) {
      doc.text(nilai[indeks] ?? "", x, y, {
        width: kolom.lebar - 6,
        align: "rataKanan" in kolom ? "right" : "left",
        lineBreak: false,
        ellipsis: true,
      });
      x += kolom.lebar;
    }
    doc.y = y + 16;
  }

  if (laporan.data.length === 0) {
    doc
      .font("Helvetica-Oblique")
      .fillColor("#475569")
      .text("Tidak ada Pembelian Lunas pada rentang tanggal ini.", MARGIN);
    doc.fillColor("#111827");
  }

  doc.moveDown(0.5);
  const yTotal = doc.y;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total", MARGIN, yTotal, {
    width: LEBAR_TABEL - KOLOM[KOLOM.length - 1]!.lebar,
  });
  doc.text(formatRupiah.format(laporan.total), MARGIN, yTotal, {
    width: LEBAR_TABEL,
    align: "right",
  });

  doc.end();
  return selesai;
}

export async function buatExcelLaporan(
  laporan: LaporanResponse,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MusicPedia";

  const sheet = workbook.addWorksheet("Laporan Penjualan");
  sheet.columns = [
    { header: "Tanggal Bayar", key: "tanggalBayar", width: 20 },
    { header: "Lagu", key: "judul", width: 32 },
    { header: "Artis", key: "artis", width: 26 },
    { header: "Pelanggan", key: "pelanggan", width: 26 },
    {
      header: "Harga",
      key: "harga",
      width: 16,
      style: { numFmt: "#,##0" },
    },
    {
      header: "Total",
      key: "total",
      width: 16,
      style: { numFmt: "#,##0" },
    },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const baris of laporan.data) {
    sheet.addRow({
      tanggalBayar: formatTanggalBayarJakarta(baris.tanggalBayar),
      judul: baris.judul,
      artis: baris.artis,
      pelanggan: baris.pelanggan,
      harga: baris.harga,
      total: baris.total,
    });
  }

  const barisTotal = sheet.addRow({ tanggalBayar: "Total", total: laporan.total });
  barisTotal.font = { bold: true };
  barisTotal.getCell(6).numFmt = "#,##0";

  const isi = await workbook.xlsx.writeBuffer();
  return Buffer.from(isi as ArrayBuffer);
}
