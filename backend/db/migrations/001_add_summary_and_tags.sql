-- Migration: add summary column to documents, add tags and document_tags tables

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

COMMIT;
