# Sesi di PostgreSQL, bukan JWT

Sesi Pelanggan dan Admin disimpan di server sebagai baris tabel `sesi` di PostgreSQL, diakses lewat `express-session` dan `connect-pg-simple`. Browser hanya memegang cookie `musicpedia.sid` yang berisi ID sesi: `httpOnly`, `SameSite=Lax`, `Secure` di produksi, dan berumur 7 hari sehingga sesi bertahan saat browser dibuka ulang. Setiap request memuat ulang akun dari database dan memeriksa `aktif`; bila Pelanggan sudah dinonaktifkan, sesinya langsung tidak berlaku.

## Alasan
- Penonaktifan Pelanggan harus berlaku seketika (User Story 19). Dengan sesi di server, Admin cukup mengubah `akun.aktif` dan request berikutnya ditolak. Tidak ada token yang masih sah sampai kedaluwarsa.
- Logout benar-benar menghapus sesi di server, bukan sekadar membuang token di browser. Ini penting untuk perangkat bersama (User Story 14).
- Database sudah ada dan wajib dipakai, jadi tidak perlu layanan tambahan. Satu VPS dengan satu instance backend tidak menuntut sesi stateless.
- Cookie `httpOnly` tidak bisa dibaca JavaScript, sehingga pencurian token lewat XSS lebih sulit dibanding menyimpan token di `localStorage`.

## Considered Options
- **JWT di cookie atau header.** Ditolak karena JWT tidak bisa dicabut tanpa daftar blokir di server. Menonaktifkan Pelanggan akan meninggalkan token yang masih berlaku sampai kedaluwarsa, bertentangan dengan User Story 19. Memendekkan umur token memindahkan masalah ke refresh token yang tetap butuh penyimpanan server.
- **Session store di memori proses.** Ditolak karena semua sesi hilang saat backend restart dan tidak bisa dipakai bila backend dijalankan lebih dari satu proses.
- **Session store di Redis.** Ditolak karena menambah satu layanan operasional yang harus di-backup dan dipantau, sementara PostgreSQL sudah menjadi sumber data utama dan bebannya kecil untuk 50 pengguna bersamaan.

## Consequences
- Setiap request terautentikasi melakukan satu kueri `SELECT` ke `akun`. Ini disengaja: status aktif selalu segar. Indeks primary key membuat biayanya kecil.
- Tabel `sesi` harus dipangkas. `connect-pg-simple` menjalankan pemangkasan berkala, dan baris kedaluwarsa tidak lagi dianggap sah.
- Mengganti `SESSION_SECRET` membatalkan semua sesi yang ada. Ini adalah cara darurat untuk memaksa semua pengguna masuk ulang.
- Cookie `Secure` hanya dikirim lewat HTTPS. Di produksi, nginx melakukan terminasi TLS dan backend mempercayai `X-Forwarded-Proto`; tanpa HTTPS, login tidak akan mempertahankan sesi.
- `SameSite=Lax` mengurangi risiko CSRF untuk navigasi lintas situs. Endpoint yang mengubah data tetap hanya menerima JSON dari origin yang sama.
