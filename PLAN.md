# PLAN — Revisi Software Request MusicPedia

### Konteks
`D:\Software Request - 26102023.pdf` berisi beberapa kontradiksi:
- Go-live tahun 2018, padahal request bertanggal 2023.
- Deskripsi berbunyi seperti langganan, tetapi use case menggambarkan penjualan per lagu.
- Security #2 bertentangan dengan use case "Mengubah Data Pribadi".
- Beberapa NFR tidak bisa diuji.

Sesi grilling (6 ronde, 24 keputusan) menyelesaikan semuanya. Hasilnya dokumen revisi di bagian B.

### File yang akan disimpan (lokasi default `D:\MusicPedia\`)
1. `Software Request - MusicPedia (revisi).md`: isi bagian B.
2. `GLOSSARY.md`: istilah domain (lihat B.7), tanpa detail implementasi.
3. `docs/adr/0001-model-pembelian-per-lagu.md`: alasan memilih pembelian per lagu, bukan langganan.
4. `PLAN.md`: salinan bagian A.

### Verifikasi
- Setiap baris dokumen asli ada di revisi.
- Setiap aktor dan use case punya istilah di glosarium.
- Tidak ada lagi teks "2018", "langganan", atau "mengurangi kuantitas pegawai".

---

