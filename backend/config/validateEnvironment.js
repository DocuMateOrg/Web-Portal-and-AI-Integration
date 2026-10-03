const fs = require('fs');
const path = require('path');

function validateBackendEnvironment(env = process.env) {
  // Cloud deployment support: if FIREBASE_KEY_JSON is provided as an env var
  // (raw JSON string or base64-encoded), write it to a temp file so the rest
  // of the app can load it via FIREBASE_KEY_PATH as usual.
  if (env.FIREBASE_KEY_JSON) {
    let jsonContent = env.FIREBASE_KEY_JSON;
    try {
      JSON.parse(jsonContent); // Already valid JSON — use as-is
    } catch {
      // Not raw JSON — try base64 decode
      try {
        jsonContent = Buffer.from(jsonContent, 'base64').toString('utf8');
        JSON.parse(jsonContent); // Validate decoded content is valid JSON
      } catch {
        throw new Error('FIREBASE_KEY_JSON must be valid JSON or base64-encoded JSON');
      }
    }
    const tmpKeyPath = path.resolve(__dirname, '..', '_firebase_key.json');
    fs.writeFileSync(tmpKeyPath, jsonContent, 'utf8');
    env.FIREBASE_KEY_PATH = tmpKeyPath;
    console.log('[startup] Firebase key written from FIREBASE_KEY_JSON env var');
  }

  const required = ['DATABASE_URL', 'FIREBASE_KEY_PATH'];
  const missing = required.filter(name => !env[name] || !env[name].trim());
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol');
  }

  const firebaseKeyPath = path.isAbsolute(env.FIREBASE_KEY_PATH)
    ? env.FIREBASE_KEY_PATH
    : path.resolve(__dirname, '..', env.FIREBASE_KEY_PATH);
  if (!fs.existsSync(firebaseKeyPath) || !fs.statSync(firebaseKeyPath).isFile()) {
    throw new Error('FIREBASE_KEY_PATH must point to an existing service-account JSON file');
  }

  return { firebaseKeyPath };
}

module.exports = { validateBackendEnvironment };
