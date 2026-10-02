-- Migration: add extracted_text column to documents

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT;

COMMIT;
