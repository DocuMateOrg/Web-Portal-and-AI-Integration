require('dotenv').config();
const { Pool } = require('pg');

// server.js validates DATABASE_URL before loading the backend routes.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
