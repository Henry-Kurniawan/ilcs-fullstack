# Penyimpanan audio di volume dan Trial dibuat dengan ffmpeg

File mp3 dan Trial tidak disimpan di dalam web root atau di database. Keduanya ditulis ke sebuah direktori audio di luar aplikasi (volume Docker `audio` di produksi, direktori sementara saat tes). Database hanya menyimpan path relatifnya pada kolom `lagu.file_mp3` dan `lagu.file_trial`. Nama berkas dibuat acak oleh server, sehingga tidak ada nama dari pengguna yang dipakai sebagai path.

Saat Admin mengunggah mp3, backend menulis unggahan ke direktori sementara dengan aliran disk (multer `diskStorage`), lalu menjalankan ffmpeg. Perintah pertama menyalin stream audio ke mp3 penuh, yang sekaligus membuktikan berkas itu audio yang bisa dibaca dan benar-benar mp3. Perintah kedua memotong mp3 itu menjadi Trial dengan `-t 29.9`. Target 29,9 detik dipakai karena encoder MP3 menambahkan padding beberapa milidetik; dengan begitu durasi Trial yang tersaji tidak pernah melewati 30 detik. Bila ffmpeg gagal, unggahan ditolak dan berkas sementara dihapus.

Trial disajikan oleh endpoint publik `GET /api/lagu/:id/trial`. Endpoint ini mendukung HTTP Range dan hanya melayani Lagu yang tidak disembunyikan. Responsnya tidak memasang `Content-Disposition`, jadi pemutar audio bisa melakukan streaming tanpa menjadikannya unduhan. mp3 penuh tidak pernah dilayani oleh endpoint publik mana pun; nanti Unduhan hanya tersedia lewat endpoint yang memeriksa kepemilikan Lagu pada Pembelian Lunas.

## Alasan
- Volume terpisah membuat penggantian image atau deploy ulang tidak menghapus audio, dan berkas tidak bisa diakses langsung lewat URL statis web server.
- Menyimpan path di database menjaga satu sumber kebenaran: Lagu yang Trial-nya belum dibuat cukup memiliki `file_trial` kosong, dan endpoint Trial menjawab 404.
- ffmpeg adalah pemeriksa format yang sebenarnya. Mempercayai ekstensi atau `Content-Type` dari browser tidak cukup karena keduanya mudah dipalsukan.
- Range wajib untuk pengalaman pemutar audio di browser: tanpa Range, Safari dan sebagian pemutar tidak bisa melompat ke tengah Trial.
- Image backend memasang paket `ffmpeg` dari distribusi image (Alpine pada image produksi), sehingga biner yang dipakai produksi tidak bergantung pada host dan tetap bisa dipakai membuat Trial.

## Considered Options
- **Menyimpan audio sebagai BLOB di PostgreSQL.** Ditolak karena database membengkak dan backup harian menjadi berat; PostgreSQL bukan tempat yang tepat untuk berkas besar yang disajikan berulang kali.
- **Menyimpan mp3 di dalam web root frontend.** Ditolak karena berkas bisa diambil langsung tanpa otorisasi, termasuk mp3 penuh yang seharusnya hanya untuk pembeli.
- **Memvalidasi dengan membaca header berkas sendiri.** Ditolak karena rapuh terhadap varian mp3 dan tidak menghasilkan Trial. ffmpeg sudah menangani keduanya.
- **Memotong Trial di browser saat diputar.** Ditolak karena mp3 penuh harus dikirim ke browser, sehingga bisa disimpan Pengunjung.
- **Menjalankan ffmpeg dari PATH tanpa konfigurasi.** Ditolak karena lingkungan pengembangan dan tes tidak selalu memiliki ffmpeg di PATH. `FFMPEG_PATH` memungkinkan biner statis dipakai tanpa mengubah kode.

## Consequences
- Operator wajib mem-backup volume audio bersama `pg_dump`; memulihkan database saja tidak memulihkan Lagu.
- `AUDIO_DIR` harus menunjuk direktori yang bisa ditulis proses backend. Di Docker Compose, direktori ini adalah volume `audio`.
- Menghapus Lagu juga menghapus kedua berkasnya. Mengganti mp3 menghapus berkas lama setelah pembaruan database berhasil.
- ffmpeg menambah waktu proses unggah. Untuk berkas berukuran puluhan MB, unggahan tidak selesai seketika; batas ukuran 50 MB menjaga waktu dan ruang disk tetap wajar.
- Trial bukan perlindungan DRM: pengguna yang menentukan bisa merekam stream. Ini diterima karena Trial memang hanya cuplikan 30 detik (ADR-0001).
