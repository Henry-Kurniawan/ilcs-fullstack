import type { Akun as AkunShared } from "@musicpedia/shared";

/**
 * Bentuk Akun yang dipakai API berasal langsung dari skema zod `shared`, agar
 * backend dan frontend tidak berbeda paham (ADR-0002).
 */
export type Akun = AkunShared;

/** Akun ditambah hash kata sandi; hanya hidup di dalam backend. */
export type AkunDenganPassword = Akun & { passwordHash: string };
