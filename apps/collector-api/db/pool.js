const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'ad_tracker',
  max: 10, // connection pool size — plenty for hourly batch writes
});

pool.on('error', (err) => {
  console.error('[postgres] unexpected error on idle client', err);
});

module.exports = pool;
