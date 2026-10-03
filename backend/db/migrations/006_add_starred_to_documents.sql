-- Migration: persist document starred state

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS starred BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
