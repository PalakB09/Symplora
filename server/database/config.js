const { Pool } = require('pg');
require('dotenv').config();

function buildPgConfig() {
  if (process.env.DATABASE_URL) {
    const shouldUseSSL =
      /^true$/i.test(process.env.DB_SSL || '') ||
      /supabase|render|heroku/i.test(process.env.DATABASE_URL);

    return {
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'leave_management_db',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: /^true$/i.test(process.env.DB_SSL || '') ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000,
  };
}


// Create pg pool
const pgPool = new Pool(buildPgConfig());

// Minimal mysql2.execute-compatible wrapper for pg
const pool = {
  execute: async (query, params = []) => {
    // convert '?' placeholders to $1, $2, ...
    let index = 0;
    const text = query.replace(/\?/g, () => `$${++index}`);
    const client = await pgPool.connect();
    try {
      const res = await client.query(text, params);
      return [res.rows, res];
    } finally {
      client.release();
    }
  },
  query: async (text, params) => pgPool.query(text, params),
};

const testConnection = async () => {
  try {
    await pgPool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
