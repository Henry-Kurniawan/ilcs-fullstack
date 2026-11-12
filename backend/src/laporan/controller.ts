import type { Request, Response } from "express";
import { laporanQuerySchema, type LaporanQuery } from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import {
  buatExcelLaporan,
  buatPdfLaporan,
  namaBerkasLaporan,
} from "./export.ts";
import type { LaporanService } from "./service.ts";

export interface LaporanController {
  laporan(req: Request, res: Response): Promise<void>;
  pdf(req: Request, res: Response): Promise<void>;
  excel(req: Request, res: Response): Promise<void>;
}

export function bacaQueryLaporan(req: Request): LaporanQuery {
  const parsed = laporanQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDASI",
      parsed.error.issues[0]?.message ?? "Rentang tanggal tidak valid.",
    );
  }
  return parsed.data;
}

function kirimBerkas(
  res: Response,
  isi: Buffer,
  contentType: string,
  namaBerkas: string,
): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${namaBerkas}"`,
  );
  res.send(isi);
}

export function createLaporanController(
  service: LaporanService,
): LaporanController {
  return {
    async laporan(req, res) {
      res.json(await service.laporan(bacaQueryLaporan(req)));
    },

    async pdf(req, res) {
      const query = bacaQueryLaporan(req);
      const laporan = await service.laporan(query);
      kirimBerkas(
        res,
        await buatPdfLaporan(laporan),
        "application/pdf",
        namaBerkasLaporan(query.dari, query.sampai, "pdf"),
      );
    },

    async excel(req, res) {
      const query = bacaQueryLaporan(req);
      const laporan = await service.laporan(query);
      kirimBerkas(
        res,
        await buatExcelLaporan(laporan),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        namaBerkasLaporan(query.dari, query.sampai, "xlsx"),
      );
    },
  };
}
