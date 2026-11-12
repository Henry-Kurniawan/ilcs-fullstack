# Software Request — MusicPedia (revisi)

**MusicPedia**

| | |
|---|---|
| **Tanggal** | 26 Oktober 2023 |
| **Deskripsi** | MusicPedia adalah aplikasi web toko musik digital. Pelanggan dapat mencari dan memutar cuplikan (trial) lagu dari artis barat maupun lokal, lalu membeli lagu per judul. Lagu yang sudah dibeli diunduh dalam format mp3 dan dapat diputar secara offline di pemutar musik mana pun. |
| **Project Sponsor** | Yusuf Irsyad, VP Business Development, PT Musika Indonesia |

### B.1 Business Need
| Pertanyaan | Jawaban |
|---|---|
| Meningkatkan pendapatan perusahaan? | 4. Sangat Setuju |
| Mengurangi biaya operasional perusahaan? | 3. Setuju |
| Meningkatkan produktivitas kerja pegawai? | 2. Ragu-Ragu |
| Meningkatkan nilai tambah intangible? | 3. Setuju |

### B.2 Business Value
**Intangible Value**
- a. Meningkatkan brand recognition perusahaan di dunia internet.

**Tangible Value (per tahun)**
- a. Mengurangi biaya operasional:
  - Sewa ruangan: Rp120.000.000,-/tahun, karena outlet musik fisik ditutup dan penjualan pindah ke online.
  - Biaya komunikasi: Rp6.000.000,-/tahun, karena pemesanan dan layanan pelanggan lewat telepon/SMS digantikan oleh website.
- b. Meningkatkan penjualan musik: Rp400.000.000,-/tahun, dari pendapatan baru penjualan lagu per judul secara online.

### B.3 Aktor
- **Pengunjung**: pengguna yang belum terdaftar.
- **Pelanggan**: pengguna yang sudah registrasi dan login dengan email + password.
- **Admin**: akun yang dibuat langsung oleh sistem (seeded), tidak melalui registrasi.
- **Payment Gateway (Midtrans, sandbox)**: aktor eksternal yang mengonfirmasi pembayaran.

### B.4 Business Requirements (use case)
| Use case | Aktor | Aturan |
|---|---|---|
| Melakukan Registrasi | Pengunjung | Setelah registrasi, Pengunjung menjadi Pelanggan. |
| Melihat Daftar Lagu | Pengunjung, Pelanggan | Cari judul/artis, filter genre, urutkan **Terbaru** (tanggal rilis) atau **Terlaris** (jumlah pembelian Lunas). Lagu yang disembunyikan tidak tampil. |
| Memutar Trial Lagu «extend» Melihat Daftar Lagu | Pengunjung, Pelanggan | Cuplikan 30 detik, hanya streaming, tidak bisa diunduh. |
| Melakukan Login dan Logout | Pelanggan, Admin | Login dengan email + password. Pelanggan nonaktif tidak bisa login. |
| Mengubah Data Pribadi | Pelanggan | Hanya data milik sendiri. |
| Melakukan Pembelian Lagu | Pelanggan, Payment Gateway | Keranjang berisi banyak lagu dan dibayar dalam satu transaksi Midtrans. Status: **Menunggu Pembayaran → Lunas \| Gagal**. Gagal bersifat final dan mencakup deny/cancel/expire serta tidak dibayar dalam 24 jam; untuk mencoba lagi, Pelanggan membuat pembelian baru. Harga dicatat saat checkout. Keranjang menolak lagu yang sudah dimiliki atau yang sedang menunggu pembayaran. |
| Mengunduh Lagu | Pelanggan | Lagu dari pembelian Lunas dapat diunduh ulang tanpa batas dalam format mp3 tanpa DRM. Tetap bisa diunduh meski lagu sudah disembunyikan dari katalog. |
| Mengelola Data Lagu | Admin | Tambah/ubah lagu dan harga per lagu. Lagu yang pernah terjual tidak dihapus, hanya disembunyikan. |
| Mengelola Data Pelanggan | Admin | Lihat, ubah, dan nonaktifkan Pelanggan. Pelanggan tidak bisa dihapus. |
| Mengekspor Laporan Penjualan Lagu | Admin | Hanya pembelian Lunas pada rentang tanggal yang dipilih. Kolom: tanggal bayar, lagu, artis, pelanggan, harga, total. Ekspor ke PDF dan Excel. |

Perubahan diagram use case:
- Tambah aktor Payment Gateway.
- Tambah garis Pengunjung → Memutar Trial Lagu.
- Tambah use case Mengunduh Lagu.

### B.5 Nonfunctional Requirements
**Operational**
1. Aplikasi web berjalan di versi terbaru Chrome, Firefox, Edge, dan Safari, baik di desktop maupun mobile.
2. Sistem memiliki tingkat ketersediaan 99%.

**Performance**
1. Waktu respon tidak lebih dari 2 detik.
2. Mampu melayani minimal 50 pengguna secara bersamaan.
3. Server memiliki antivirus/anti-malware dengan pembaruan signature harian.

**Security**
1. Akses ke sistem tanpa otorisasi tidak dimungkinkan.
2. Data katalog lagu dan data pelanggan lain hanya dapat diubah oleh Admin. Pelanggan hanya dapat mengubah data pribadinya sendiri.
3. Seluruh data di-backup setiap 24 jam dan hasil backup disimpan di lokasi yang berbeda dengan sistem.
4. Seluruh komunikasi client-server menggunakan HTTPS (TLS 1.2 atau lebih baru).

**Deadline**
- Aplikasi go-live paling lambat 3 bulan setelah kickoff proyek.

### B.6 Daftar perubahan dari dokumen asli
1. Tanggal go-live 25 Jan 2018 dihapus dan diganti dengan durasi 3 bulan sejak kickoff.
2. Deskripsi diselaraskan dengan model pembelian per lagu dan platform web.
3. Klaim intangible "produktivitas/mengurangi kuantitas pegawai" dihapus agar konsisten dengan jawaban Ragu-Ragu.
4. Tangible value diberi periode (per tahun) dan alasan.
5. Security #2 ditulis ulang supaya tidak bertentangan dengan use case Mengubah Data Pribadi.
6. NFR yang samar ditulis ulang agar bisa diuji: interop, antivirus, jumlah pengguna, dan HTTPS.
7. Ditambahkan aktor Payment Gateway, use case Mengunduh Lagu, dan aturan untuk setiap use case.

### B.7 Glosarium (ringkas)
- **Pengunjung**: pengguna yang belum registrasi.
- **Pelanggan**: pengguna terdaftar yang dapat membeli dan mengunduh lagu.
- **Admin**: pengelola katalog, data pelanggan, dan laporan.
- **Lagu**: satu judul dengan harga sendiri. Lagu dapat disembunyikan, tetapi lagu yang pernah terjual tidak dihapus.
- **Trial**: cuplikan 30 detik yang hanya bisa di-stream.
- **Keranjang**: daftar lagu yang akan dibeli dalam satu Pembelian.
- **Pembelian**: satu transaksi untuk satu atau lebih Lagu. Statusnya Menunggu Pembayaran, Lunas, atau Gagal.
- **Unduhan**: pengambilan file mp3 dari Lagu yang pembeliannya sudah Lunas.
- **Laporan Penjualan**: rekap Pembelian Lunas pada rentang tanggal tertentu.
- **Terbaru / Terlaris**: urutan berdasarkan tanggal rilis / jumlah Pembelian Lunas.
