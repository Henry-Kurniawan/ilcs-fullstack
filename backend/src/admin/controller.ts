import { rm } from "node:fs/promises";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  daftarLaguAdminQuerySchema,
  genreInputSchema,
  laguInputSchema,
  laguUbahSchema,
  tersembunyiLaguRequestSchema,
} from "@musicpedia/shared";
import { AppError } from "../errors.ts";
import { createUploadAudio } from "../media/upload.ts";
import type { GenreAdminService } from "./genre-service.ts";
import type { LaguAdminService } from "./lagu-service.ts";

function ambilId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDASI", "Id tidak valid.");
  }
  return id;
}

function pesanValidasi(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

async function bersihkanBerkasSementara(req: Request): Promise<void> {
  if (req.file) {
    await rm(req.file.path, { force: true });
  }
}

export function createLaguAdminController(
  service: LaguAdminService,
  audioDir: string,
) {
  const unggah = createUploadAudio(audioDir);

  function denganUnggahan(
    handler: (req: Request, res: Response) => Promise<void>,
  ): RequestHandler {
    return (req, res, next: NextFunction) => {
      unggah(req, res, (error: unknown) => {
        if (error) {
          const kode = (error as { code?: string }).code;
          next(
            new AppError(
              400,
              "VALIDASI",
              kode === "LIMIT_FILE_SIZE"
                ? "Ukuran file mp3 maksimal 50 MB."
                : "Berkas unggahan tidak valid.",
            ),
          );
          return;
        }
        handler(req, res).catch(next);
      });
    };
  }

  return {
    daftar: async (req: Request, res: Response) => {
      const parsed = daftarLaguAdminQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDASI",
          "Parameter daftar Lagu tidak valid.",
        );
      }
      const result = await service.daftar({
        cari: parsed.data.cari === "" ? undefined : parsed.data.cari,
        genre: parsed.data.genre,
        halaman: parsed.data.halaman,
        ukuran: parsed.data.ukuran,
      });
      res.json(result);
    },

    detail: async (req: Request, res: Response) => {
      res.json({ data: await service.detail(ambilId(req)) });
    },

    tambah: denganUnggahan(async (req, res) => {
      try {
        const parsed = laguInputSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError(400, "VALIDASI", pesanValidasi(parsed.error));
        }
        if (!req.file) {
          throw new AppError(400, "VALIDASI", "File mp3 wajib diunggah.");
        }
        const lagu = await service.tambah(parsed.data, req.file.path);
        res.status(201).json({ data: lagu });
      } finally {
        await bersihkanBerkasSementara(req);
      }
    }),

    ubah: denganUnggahan(async (req, res) => {
      try {
        const parsed = laguUbahSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError(400, "VALIDASI", pesanValidasi(parsed.error));
        }
        const lagu = await service.ubah(
          ambilId(req),
          parsed.data,
          req.file?.path ?? null,
        );
        res.json({ data: lagu });
      } finally {
        await bersihkanBerkasSementara(req);
      }
    }),

    aturTersembunyi: async (req: Request, res: Response) => {
      const parsed = tersembunyiLaguRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDASI", pesanValidasi(parsed.error));
      }
      res.json({
        data: await service.aturTersembunyi(
          ambilId(req),
          parsed.data.tersembunyi,
        ),
      });
    },

    hapus: async (req: Request, res: Response) => {
      await service.hapus(ambilId(req));
      res.status(204).end();
    },
  };
}

export function createGenreAdminController(service: GenreAdminService) {
  return {
    tambah: async (req: Request, res: Response) => {
      const parsed = genreInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDASI", pesanValidasi(parsed.error));
      }
      res.status(201).json({ data: await service.tambah(parsed.data.nama) });
    },

    ubah: async (req: Request, res: Response) => {
      const parsed = genreInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDASI", pesanValidasi(parsed.error));
      }
      res.json({
        data: await service.ubah(ambilId(req), parsed.data.nama),
      });
    },

    hapus: async (req: Request, res: Response) => {
      await service.hapus(ambilId(req));
      res.status(204).end();
    },
  };
}
