-- Up Migration
CREATE TABLE akun (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  peran text NOT NULL CHECK (peran IN ('PELANGGAN', 'ADMIN')),
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX akun_email_unik ON akun (lower(email));

CREATE TABLE sesi (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX sesi_expire_idx ON sesi (expire);

-- Down Migration
DROP TABLE sesi;
DROP TABLE akun;
