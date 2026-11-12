-- Up Migration

CREATE TABLE genre (
  id serial PRIMARY KEY,
  nama text NOT NULL UNIQUE
);

CREATE TABLE lagu (
  id serial PRIMARY KEY,
  judul text NOT NULL,
  artis text NOT NULL,
  genre_id integer NOT NULL REFERENCES genre (id),
  pencipta text NOT NULL,
  label_rekaman text NOT NULL,
  tanggal_rilis date NOT NULL,
  harga integer NOT NULL CHECK (harga > 0),
  tersembunyi boolean NOT NULL DEFAULT false,
  file_mp3 text,
  file_trial text,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lagu_terbaru_idx ON lagu (tanggal_rilis DESC, id DESC);

-- Down Migration

DROP TABLE lagu;
DROP TABLE genre;
