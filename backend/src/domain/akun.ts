import type { Peran } from "@musicpedia/shared";

export interface Akun {
  id: number;
  email: string;
  peran: Peran;
  aktif: boolean;
}

export interface AkunDenganPassword extends Akun {
  passwordHash: string;
}
