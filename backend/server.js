const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { validateBackendEnvironment } = require('./config/validateEnvironment');
try {
  const { firebaseKeyPath } = validateBackendEnvironment();
  process.env.FIREBASE_KEY_PATH = firebaseKeyPath;
} catch (error) {
  console.error(`[startup] ${error.message}`);
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',') }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Public health check (before auth)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'documate-backend' }));

app.use(require('./middleware/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/storage', require('./routes/storage'));
app.use('/api/ocr', require('./routes/ocr'));
app.use('/api/convert', require('./routes/convert'));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
require('./services/elastic').ensureIndex()
  .then(() => console.log('Elasticsearch index ready'))
  .catch(e => console.warn('Elasticsearch not available (search falls back to Postgres):', e.message));

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
