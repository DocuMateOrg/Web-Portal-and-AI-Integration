-- DocuMate Full Database Schema (All Migrations Combined for Supabase)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id                 SERIAL PRIMARY KEY,
  filename           TEXT NOT NULL,
  file_url           TEXT,
  group_id           INTEGER,
  uploader_id        INTEGER REFERENCES users(id),
  status             TEXT NOT NULL DEFAULT 'uploaded'
                     CHECK (status IN ('uploaded','processed','trashed')),
  category           TEXT,
  language           TEXT,
  confidence         REAL,
  audio_url          TEXT,
  summary            TEXT,
  extracted_text     TEXT,
  slug               TEXT,
  search_vector      tsvector,
  starred            BOOLEAN NOT NULL DEFAULT FALSE,
  file_size          BIGINT,
  combined_audio_url TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- Search vector trigger & function
CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  new.search_vector := to_tsvector('english', coalesce(new.extracted_text,'') || ' ' || coalesce(new.summary,''));
  IF new.slug IS NULL OR new.slug = '' THEN
    new.slug := lower(regexp_replace(coalesce(new.filename,''), '[^a-z0-9]+', '-', 'g'));
  END IF;
  RETURN new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
CREATE TRIGGER documents_search_vector_trigger
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE PROCEDURE documents_search_vector_trigger();

CREATE INDEX IF NOT EXISTS documents_search_vector_idx ON documents USING GIN(search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS documents_slug_idx ON documents(slug);

-- Groups & permissions
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_groups (
  user_id  INTEGER NOT NULL,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS group_permissions (
  group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_id)
);

-- Seed default group, permissions, and dev user
INSERT INTO groups(id, name, description) VALUES (1, 'Default', 'Everyone starts here') ON CONFLICT DO NOTHING;
INSERT INTO permissions(name, description) VALUES
  ('upload', 'Upload documents'),
  ('process', 'Save OCR/summary results'),
  ('share', 'Share documents')
ON CONFLICT DO NOTHING;
INSERT INTO group_permissions(group_id, permission_id)
  SELECT 1, id FROM permissions ON CONFLICT DO NOTHING;

INSERT INTO users(id, firebase_uid, email) VALUES (1, 'dev-user', 'dev@local') ON CONFLICT DO NOTHING;
INSERT INTO user_groups(user_id, group_id) VALUES (1, 1) ON CONFLICT DO NOTHING;

SELECT setval('groups_id_seq', GREATEST((SELECT max(id) FROM groups), 1));
SELECT setval('users_id_seq',  GREATEST((SELECT max(id) FROM users), 1));
