-- Track shared batch-summary audio so it can be removed with the batch's last document

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS combined_audio_url TEXT;

COMMIT;
