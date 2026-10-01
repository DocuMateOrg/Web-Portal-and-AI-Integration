-- Migration: add slug column and search_vector (tsvector) + trigger and GIN index

BEGIN;

ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add tsvector column for full-text search
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector and slug
CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
begin
  -- build search vector from extracted_text and summary
  new.search_vector := to_tsvector('english', coalesce(new.extracted_text,'') || ' ' || coalesce(new.summary,''));

  -- if slug empty, create from filename
  if new.slug IS NULL OR new.slug = '' then
    new.slug := lower(regexp_replace(coalesce(new.filename,''), '[^a-z0-9]+', '-', 'g'));
  end if;
  return new;
end
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
CREATE TRIGGER documents_search_vector_trigger
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE PROCEDURE documents_search_vector_trigger();

-- Create GIN index
CREATE INDEX IF NOT EXISTS documents_search_vector_idx ON documents USING GIN(search_vector);

-- Ensure slug uniqueness (if desired)
CREATE UNIQUE INDEX IF NOT EXISTS documents_slug_idx ON documents(slug);

COMMIT;
