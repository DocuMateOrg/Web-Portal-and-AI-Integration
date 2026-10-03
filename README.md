# DocuMate

DocuMate is a document digitization and management system with a React web portal, a Node.js/PostgreSQL API, and a FastAPI AI service. It supports image and PDF OCR, Sinhala/English summaries and speech, searchable document management, batch processing, and cloud file storage.

## Services

| Service | Technology | Local address |
| --- | --- | --- |
| Web portal | React / Create React App | http://localhost:3000 |
| Backend API | Express / Node.js | http://localhost:4000 |
| AI service | FastAPI / Python | http://localhost:8000 |
| PostgreSQL | Docker Compose | localhost:5432 |
| Elasticsearch (optional) | Docker Compose | http://localhost:9200 |

## Prerequisites

- Node.js and npm
- Python 3.10 or newer
- Docker Desktop (for the local PostgreSQL and Elasticsearch services)
- A Firebase project with Authentication enabled and a Firebase Admin service-account JSON key
- A Gemini API key
- A Supabase project with a public Storage bucket (default bucket name: `documents`)

## Configure environment

Do not commit `.env` files, Firebase service-account keys, or Supabase service-role keys. The root `.gitignore` excludes `.env` and `serviceAccountKey.json` files.

### Backend: `backend/.env`

The backend fails during startup when either required variable is missing or invalid.

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/documents
FIREBASE_KEY_PATH=./serviceAccountKey.json
```

- `DATABASE_URL` is a PostgreSQL connection URL.
- `FIREBASE_KEY_PATH` is required and points to the Firebase Admin service-account JSON file. Relative paths are resolved from the `backend` directory. Keep the JSON file private and ignored by Git.

Optional backend variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Backend HTTP port |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed browser origins |
| `ELASTIC_URL` | `http://localhost:9200` | Elasticsearch URL; search falls back to PostgreSQL when unavailable |
| `ELASTIC_INDEX` | `documents` | Elasticsearch index name |
| `SUPABASE_URL` | Not set | Supabase project URL, needed for deleting Supabase-stored files/audio |
| `SUPABASE_SERVICE_ROLE_KEY` | Not set | Private Supabase service-role key; never expose it in browser code |
| `SUPABASE_BUCKET` | `documents` | Supabase Storage bucket |

### AI service: `ai-service/.env`

```dotenv
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_BUCKET=documents
```

`GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are required for AI processing and cloud uploads. `SUPABASE_BUCKET` defaults to `documents`. An example Supabase-only template is available at [ai-service/supabase.env.example](./ai-service/supabase.env.example); add the Gemini key to your local `.env` without committing it.

### Web portal

The portal uses `REACT_APP_API_URL` when set and otherwise calls `http://localhost:4000`. The Firebase web client configuration is currently in `documate-website/src/firebase.js`; replace it with your Firebase project's client configuration when deploying a different project. Client configuration is not a substitute for keeping Admin credentials private.

## Run locally

Start the database and optional search engine from the repository root:

```sh
docker compose up -d
```

The SQL scripts in `backend/db/migrations` are mounted as PostgreSQL initialization scripts. Docker runs them only when it creates a new database data volume. For an existing database, apply any new migration scripts explicitly before running the application.

Start each application service in its own terminal:

**1. Backend API**

```sh
cd backend
npm install
npm start
```

**2. AI service**

```sh
cd ai-service
python -m venv .venv
```

Activate the environment (`.venv\Scripts\Activate.ps1` in PowerShell, or `source .venv/bin/activate` on macOS/Linux), then:

```sh
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**3. Web portal**

```sh
cd documate-website
npm install
npm start
```

Open http://localhost:3000. The backend health check is at http://localhost:4000/health and the AI service health check is at http://localhost:8000/.

To run the repository integration checks after all services are running:

```sh
node scripts/verify.js
```

## Database migrations

Migrations are ordered by their numeric filename prefix in `backend/db/migrations`. For an existing database, use `psql` with the configured connection string to apply each migration that has not already been applied. Back up the database before applying schema changes.

## Sprint outcomes

See [SPRINTS.md](./SPRINTS.md) for the Sprint 1–5 objectives, delivered outcomes, and SDLC evidence summary.
