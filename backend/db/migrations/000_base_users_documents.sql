-- Base tables that the other migrations assume already exist
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL,
  file_url    TEXT,
  group_id    INTEGER,
  uploader_id INTEGER REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'uploaded'
              CHECK (status IN ('uploaded','processed','trashed')),
  category    TEXT,
  language    TEXT,
  confidence  REAL,
  audio_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
