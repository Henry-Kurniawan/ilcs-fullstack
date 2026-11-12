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
- Tabel `akun` menyimpan `nama` (teks, default kosong sampai Pelanggan mengisi profilnya sendiri). Kolom ini dipakai halaman profil Pelanggan dan area Admin untuk mencari serta mengubah data Pelanggan.
- Sesi disimpan di tabel `sesi` PostgreSQL lewat cookie `musicpedia.sid` (`httpOnly`, `SameSite=Lax`, `Secure` bila `NODE_ENV=production`). Alasannya ada di [ADR 0003](docs/adr/0003-sesi-di-postgresql.md).
- `SESSION_SECRET` wajib diisi di produksi. `ADMIN_PASSWORD` juga wajib diisi saat menjalankan seed di produksi.

## Audio dan Trial
- Admin menambah Lagu lewat area Admin (`/admin/lagu`) dengan mengunggah mp3. ffmpeg memvalidasi berkas lalu membuat Trial berdurasi paling lama 30 detik.
- `AUDIO_DIR` menyimpan mp3 dan Trial di luar web root; database hanya mencatat path relatifnya. `FFMPEG_PATH` menunjuk biner ffmpeg (bawaannya `ffmpeg` di PATH).
- Trial hanya bisa di-stream lewat `/api/lagu/:id/trial` untuk Lagu yang tidak disembunyikan. mp3 penuh tidak pernah disajikan endpoint publik.
- Alasan dan konsekuensinya ada di [ADR 0004](docs/adr/0004-penyimpanan-audio-dan-trial.md).

## Area Admin
- Admin mengelola Pelanggan di `/admin/pelanggan`: daftar dengan pencarian nama atau email dan paginasi, ubah nama/email, serta nonaktifkan dan aktifkan kembali.
- Admin mengelola Lagu di `/admin/lagu` dan Genre di `/admin/genre`, termasuk menyembunyikan Lagu dan menghapus Genre yang belum dipakai.
- Pelanggan tidak pernah dihapus; API tidak menyediakan endpoint hapus. Menonaktifkan Pelanggan langsung memutus sesi aktifnya pada request berikutnya (ADR 0003), dan mengaktifkannya kembali membuat Pelanggan bisa login lagi.
- Akun Admin tidak pernah muncul di daftar Pelanggan. Admin juga tidak dapat menonaktifkan akunnya sendiri lewat area ini.

## Pembelian dan Midtrans
- Pelanggan menekan **Checkout dan bayar** di Keranjang. Keranjang menjadi satu Pembelian berstatus Menunggu Pembayaran dan halaman Snap dibuka dengan token dari server.
- Checkout berjalan dalam satu transaksi DB: baris Pelanggan dikunci (`SELECT … FOR UPDATE`), aturan Keranjang divalidasi ulang, Pembelian dan Item Pembelian dibuat dengan harga saat checkout, Keranjang dikosongkan, lalu token Snap diminta dengan masa berlaku 24 jam. Bila gateway gagal, semuanya di-rollback.
- Riwayat Pembelian ada di `/pembelian`. Pembelian Menunggu Pembayaran bisa dilanjutkan dengan token Snap yang tersimpan, tanpa membuat transaksi baru.
- `MIDTRANS_SERVER_KEY` hanya ada di server. Frontend memuat `MIDTRANS_CLIENT_KEY` dan URL snap.js lewat `GET /api/konfigurasi`.
- `MIDTRANS_PRODUCTION=true` memakai endpoint Midtrans produksi; nilai lain memakai sandbox.
- Katalog bisa diurutkan Terlaris lewat `GET /api/lagu?urutan=terlaris`: jumlah Pembelian Lunas yang memuat Lagu itu, lalu Terbaru sebagai penentu seri. Lagu tanpa penjualan ada di akhir.

### Webhook Midtrans
`POST /api/webhook/midtrans` menerima notifikasi Midtrans dan memindahkan Pembelian dari Menunggu Pembayaran ke Lunas atau Gagal.

- Endpoint ini publik karena Midtrans tidak membawa sesi Pelanggan. Keaslian permintaan dijaga oleh `signature_key`, yaitu SHA-512 dari `order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`. Signature salah ditolak `401` tanpa mengubah data.
- Isi notifikasi tidak dipercaya sendiri: status dicek ulang ke Status API Midtrans. `settlement`, atau `capture` dengan `fraud_status=accept`, membuat Pembelian Lunas dan mencatat waktu bayar. `deny`, `cancel`, dan `expire` membuatnya Gagal. `pending` dan status lain diabaikan, tetapi tetap dijawab `200` agar Midtrans berhenti mencoba ulang.
- Transisi hanya berlaku dari Menunggu Pembayaran, jadi notifikasi ganda atau terlambat tidak mengubah Pembelian yang sudah Lunas atau Gagal.

### Menerima webhook Midtrans sandbox di mesin lokal
Midtrans tidak bisa menjangkau `localhost`, jadi saat dev gunakan tunnel cloudflared:

1. Pasang cloudflared: `brew install cloudflared` di macOS, atau unduh paket dari [rilis cloudflared](https://github.com/cloudflare/cloudflared/releases) di Linux/Windows.
2. Jalankan `npm run dev`, lalu di terminal lain jalankan `cloudflared tunnel --url http://localhost:3000`. Catat URL acak yang dicetak, misalnya `https://contoh-acak.trycloudflare.com`.
3. Di dashboard Midtrans sandbox, buka **Settings → Payment Notification URL** dan isi `https://contoh-acak.trycloudflare.com/api/webhook/midtrans`.
4. Pastikan `MIDTRANS_SERVER_KEY` di `.env` sama dengan server key sandbox yang dipakai Midtrans. Nilai ini dipakai untuk memverifikasi signature dan memanggil Status API.
5. Lakukan pembayaran uji lewat Snap sandbox. Notifikasi akan masuk ke backend dan status Pembelian berubah di halaman riwayat.

URL `trycloudflare.com` berganti setiap kali tunnel dijalankan ulang, jadi perbarui Payment Notification URL bila perlu. Untuk webhook dari mesin lokal ini `MIDTRANS_PRODUCTION` harus `false`.


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
