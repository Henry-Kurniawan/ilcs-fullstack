-- Up Migration

CREATE TABLE pembelian (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pelanggan_id integer NOT NULL REFERENCES akun (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN'
    CHECK (status IN ('MENUNGGU_PEMBAYARAN', 'LUNAS', 'GAGAL')),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  -- Kode order yang dikirim ke Midtrans. Bentuknya "MP-" + UUID, dibuat di
  -- server saat checkout; nilai bawaan menjaga baris buatan alat lain tetap sah.
  kode_order text NOT NULL UNIQUE DEFAULT ('MP-' || gen_random_uuid()),
  -- Token Snap disimpan agar Pembelian Menunggu Pembayaran bisa dilanjutkan
  -- tanpa membuat transaksi gateway baru.
  token_snap text,
  kedaluwarsa_pada timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  dibayar_pada timestamptz
);

CREATE INDEX pembelian_pelanggan_idx
  ON pembelian (pelanggan_id, dibuat_pada DESC, id DESC);

CREATE INDEX pembelian_status_kedaluwarsa_idx
  ON pembelian (status, kedaluwarsa_pada);

CREATE TABLE item_pembelian (
  pembelian_id integer NOT NULL REFERENCES pembelian (id) ON DELETE CASCADE,
  -- RESTRICT, bukan CASCADE: riwayat Pembelian harus tetap utuh dan Admin
  -- hanya boleh menghapus Lagu yang belum ada di Item Pembelian mana pun.
  lagu_id integer NOT NULL REFERENCES lagu (id) ON DELETE RESTRICT,
  -- Harga Lagu saat checkout; tidak ikut berubah saat Admin mengubah harga.
  harga integer NOT NULL DEFAULT 0 CHECK (harga >= 0),
  PRIMARY KEY (pembelian_id, lagu_id)
);

CREATE INDEX item_pembelian_lagu_idx ON item_pembelian (lagu_id);

-- Down Migration

DROP TABLE item_pembelian;
DROP TABLE pembelian;
