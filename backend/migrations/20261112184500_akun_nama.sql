-- Up Migration
ALTER TABLE akun ADD COLUMN nama text NOT NULL DEFAULT '';

-- Down Migration
ALTER TABLE akun DROP COLUMN nama;
