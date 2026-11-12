-- Up Migration
ALTER TABLE akun ADD COLUMN telepon text;

-- Down Migration
ALTER TABLE akun DROP COLUMN telepon;
