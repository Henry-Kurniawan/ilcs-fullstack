# MusicPedia

MusicPedia adalah toko musik digital berbasis web milik PT Musika Indonesia. Pelanggan membeli lagu per judul lalu mengunduhnya sebagai mp3 untuk didengarkan secara offline.

## Pengguna

**Pengunjung**:
Orang yang membuka MusicPedia tanpa akun terdaftar.
_Avoid_: Guest, tamu, user

**Pelanggan**:
Orang yang sudah registrasi dan dapat membeli serta mengunduh Lagu. Pelanggan dapat dinonaktifkan, tetapi tidak pernah dihapus.
_Avoid_: Member, customer, user, akun

**Admin**:
Pegawai PT Musika Indonesia yang mengelola katalog, data Pelanggan, dan Laporan Penjualan. Akunnya tidak dibuat lewat registrasi.
_Avoid_: Operator, administrator sistem

## Katalog

**Lagu**:
Satu judul musik dengan harga sendiri yang dijual di MusicPedia. Lagu dapat disembunyikan dari katalog, tetapi Lagu yang pernah terjual tidak pernah dihapus.
_Avoid_: Track, musik, audio, produk

**Trial**:
Cuplikan 30 detik dari sebuah Lagu yang hanya bisa di-stream dan tidak bisa diunduh.
_Avoid_: Preview, sample, demo

**Terbaru**:
Urutan Lagu berdasarkan tanggal rilis, dari yang paling baru.

**Terlaris**:
Urutan Lagu berdasarkan jumlah Pembelian Lunas yang memuat Lagu tersebut.
_Avoid_: Top, populer, chart

## Pembelian

**Keranjang**:
Kumpulan Lagu yang dipilih Pelanggan sebelum checkout. Keranjang tidak menerima Lagu yang sudah dimiliki atau yang sedang Menunggu Pembayaran.
_Avoid_: Cart, troli

**Pembelian**:
Satu transaksi pembayaran untuk satu atau lebih Lagu, dengan harga yang dicatat saat checkout.
_Avoid_: Order, pesanan, transaksi, langganan

**Menunggu Pembayaran**:
Status awal Pembelian, sebelum Payment Gateway mengonfirmasi hasil pembayaran.
_Avoid_: Pending

**Lunas**:
Status akhir Pembelian yang sudah dibayar. Semua Lagu di dalamnya menjadi milik Pelanggan.
_Avoid_: Paid, sukses, settlement

**Gagal**:
Status akhir Pembelian yang tidak dibayar: ditolak, dibatalkan, kedaluwarsa, atau tidak dibayar dalam 24 jam. Pembelian yang Gagal tidak bisa dibuka lagi.
_Avoid_: Expired, batal, cancel

**Payment Gateway**:
Layanan eksternal (Midtrans) yang menerima pembayaran dan menentukan apakah Pembelian menjadi Lunas atau Gagal.

**Unduhan**:
Pengambilan file mp3 sebuah Lagu oleh Pelanggan yang memilikinya. Unduhan bisa diulang tanpa batas.
_Avoid_: Download, streaming

## Laporan

**Laporan Penjualan**:
Rekap Pembelian Lunas dalam rentang tanggal yang dipilih Admin.
_Avoid_: Laporan transaksi, rekap order
