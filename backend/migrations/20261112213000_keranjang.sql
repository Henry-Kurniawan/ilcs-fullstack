-- Up Migration

CREATE TABLE keranjang (
  pelanggan_id integer NOT NULL REFERENCES akun (id) ON DELETE CASCADE,
  lagu_id integer NOT NULL REFERENCES lagu (id) ON DELETE CASCADE,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pelanggan_id, lagu_id)
);

CREATE INDEX keranjang_lagu_idx ON keranjang (lagu_id);

-- Down Migration

DROP TABLE keranjang;
