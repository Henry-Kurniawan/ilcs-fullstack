# Model bisnis: pembelian per lagu, bukan langganan

Deskripsi di Software Request (26 Okt 2023) menjanjikan "akses lengkap ke jutaan lagu", yang terdengar seperti layanan langganan. Namun use case "Melakukan Pembelian Lagu", "Laporan Penjualan Lagu", dan target tangible "penjualan musik Rp400jt" semuanya menggambarkan penjualan per judul. Kami memilih **pembelian per lagu**. Pelanggan membayar setiap Lagu (bisa beberapa sekaligus dalam satu Pembelian) dan memperoleh mp3 tanpa DRM yang bisa diunduh ulang tanpa batas.

## Considered Options
- **Langganan bulanan.** Ditolak karena membutuhkan kontrol pemutaran (DRM/streaming) yang bertentangan dengan janji "mp3 offline", dan semua use case serta laporan harus diganti namanya.
- **Gabungan per lagu + langganan.** Ditolak karena paling kompleks untuk tenggat 3 bulan.

## Consequences
- Karena file mp3 bebas disalin, risiko pembajakan ditanggung lewat perjanjian lisensi dengan label, bukan lewat teknologi.
- Lagu yang pernah terjual tidak boleh dihapus, hanya disembunyikan, agar pembelinya tetap bisa mengunduh.
