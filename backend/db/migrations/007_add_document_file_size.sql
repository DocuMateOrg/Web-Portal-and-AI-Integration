-- Migration: track original uploaded document sizes for storage usage

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

COMMIT;
