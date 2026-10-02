require('dotenv').config();
const { Pool } = require('pg');

// Reads DATABASE_URL (preferred) or the individual PG* variables from .env
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'documents',
        password: process.env.PGPASSWORD,
        port: Number(process.env.PGPORT || 5432),
      }
);
module.exports = pool;
