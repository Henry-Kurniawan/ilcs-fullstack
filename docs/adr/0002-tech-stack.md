# Stack: TypeScript, Express, dan PostgreSQL tanpa ORM

Kami memakai **TypeScript strict** di frontend, backend, dan paket `shared` dalam satu repo npm workspaces dengan satu lockfile. Backend adalah Express yang dibuat lewat factory `createApp({ pool, config })`, sehingga tes dapat memberinya koneksi PostgreSQL sungguhan. Data diakses dengan `pg` (node-postgres) dan kueri SQL berparameter. Skema dikelola lewat migrasi SQL `node-pg-migrate`. Operasi yang harus atomik, seperti Pembelian, dibungkus helper `withTransaction`. Skema zod di `shared` menjadi satu-satunya definisi bentuk data yang dipakai kedua sisi.

Backend dijalankan langsung oleh Node 26 dengan type stripping, tanpa langkah build. Karena itu `erasableSyntaxOnly` aktif: tidak ada enum, namespace, atau parameter property. Hanya frontend yang di-build (Vite).

## Alasan
- Tipe bersama lewat `shared` mencegah frontend dan backend berbeda paham soal bentuk respons API.
- Alur Route → Controller → Service → Repository tetap terbaca karena SQL ditulis eksplisit di Repository. Transaksi Pembelian dan unduhan Lagu yang sudah Lunas mudah diaudit.
- Tanpa build backend, tidak ada artefak `dist` yang bisa usang, dan image produksi cukup menjalankan `node`.

## Considered Options
- **ORM (Prisma, Drizzle, TypeORM).** Ditolak karena menambah lapisan abstraksi dan generator kode untuk skema yang kecil. Kontrol atas transaksi dan kueri laporan penjualan lebih jelas dengan SQL langsung.
- **JavaScript biasa (.js dan .jsx).** Ditolak karena kontrak antara frontend dan backend tidak diperiksa kompiler. Keputusan awal ini diganti.
- **TypeScript dengan build `tsc` untuk backend.** Ditolak karena menambah langkah build dan artefak tanpa manfaat, sebab Node 26 sudah menjalankan TypeScript yang hanya berisi sintaks terhapus.

## Consequences
- Semua impor relatif di backend harus memakai ekstensi `.ts`, dan paket `shared` diekspor langsung dari sumber `.ts`.
- Pemetaan baris database ke objek dilakukan manual di Repository, dan perubahan skema harus ditulis sebagai migrasi SQL.
- Tes API berjalan terhadap PostgreSQL sungguhan, jadi `npm test` membutuhkan Docker.
- Keamanan dasar tidak berubah: kata sandi di-hash dengan BCrypt, autentikasi, pemeriksaan peran, dan kepemilikan data diterapkan di API, serta secret dan kredensial database hanya ada di sisi server.
