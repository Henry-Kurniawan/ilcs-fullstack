# MusicPedia

Toko Lagu digital PT Musika Indonesia. Istilah domain ada di [GLOSSARY.md](GLOSSARY.md), keputusan arsitektur di [docs/adr](docs/adr).

## Stack
- TypeScript strict dalam npm workspaces: `frontend`, `backend`, `shared`
- Frontend: React, Vite, Tailwind CSS v4, React Router
- Backend: Express, dijalankan langsung oleh Node dengan type stripping (tanpa build)
- Database: PostgreSQL lewat `pg` tanpa ORM, migrasi dengan `node-pg-migrate`
- `shared`: skema zod yang diimpor frontend dan backend
- Tes: Vitest, Supertest, dan Testing Library

Alasan pemilihan: [ADR 0002](docs/adr/0002-tech-stack.md).

## Setup
Prasyarat: Node 22.18 atau lebih baru (target produksi Node 26), npm, dan Docker.

```sh
npm install
cp .env.example .env   # opsional, nilai bawaan sudah cocok dengan Docker Compose
npm run dev            # PostgreSQL, migrasi, backend (:3000), frontend (:5173)
npm run seed           # membuat akun Admin serta Genre dan Lagu Data Demo
```

Buka http://localhost:5173. Halaman awal menampilkan katalog Lagu dari `/api/lagu` di dalam header berisi status sesi (frontend memakai proxy Vite ke `/api`).

## Akun dan sesi
- Registrasi hanya membuat Pelanggan. Admin tidak pernah dibuat lewat registrasi.
- `npm run seed` bersifat idempoten: menjalankannya berulang kali tetap menghasilkan satu Admin, dan tidak menggandakan Genre maupun Lagu Data Demo.
- Sesi disimpan di tabel `sesi` PostgreSQL lewat cookie `musicpedia.sid` (`httpOnly`, `SameSite=Lax`, `Secure` bila `NODE_ENV=production`). Alasannya ada di [ADR 0003](docs/adr/0003-sesi-di-postgresql.md).
- `SESSION_SECRET` wajib diisi di produksi. `ADMIN_PASSWORD` juga wajib diisi saat menjalankan seed di produksi.

## Perintah
| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan PostgreSQL, migrasi, backend, dan frontend |
| `npm test` | `tsc --noEmit` semua workspace, lalu Vitest (membutuhkan Docker untuk PostgreSQL) |
| `npm run build` | Build frontend ke `frontend/dist` |
| `npm run migrate` | Menjalankan migrasi SQL di `backend/migrations` |
| `npm run seed` | Menjalankan migrasi lalu mengisi akun Admin serta Genre dan Lagu Data Demo secara idempoten |
| `npm run db:up` | Menjalankan PostgreSQL saja |

PostgreSQL dev berjalan di port 5433. Tes memakai database `musicpedia_test` yang dibuat ulang setiap kali dijalankan.
