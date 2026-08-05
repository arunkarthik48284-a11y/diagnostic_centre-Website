const path = require('path');
const fs = require('fs');

const rawDbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const DATABASE_URL = (rawDbUrl && !rawDbUrl.includes('[YOUR-PASSWORD]') && !rawDbUrl.includes('[PASSWORD]')) ? rawDbUrl : null;
let isPostgres = false;
let pgPool = null;
let sqliteDb = null;

if (DATABASE_URL) {
  isPostgres = true;
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
  });
  console.log('⚡ Connected to Supabase PostgreSQL Database');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../../quickdiag.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
    }
  });
  sqliteDb.run('PRAGMA foreign_keys = ON;');
}

const query = {
  isPostgres() {
    return isPostgres;
  },

  async get(sql, params = []) {
    if (isPostgres) {
      // Convert SQLite ? placeholders to $1, $2 for Postgres
      let paramIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      const res = await pgPool.query(pgSql, params);
      return res.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  },

  async all(sql, params = []) {
    if (isPostgres) {
      let paramIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      const res = await pgPool.query(pgSql, params);
      return res.rows;
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  },

  async run(sql, params = []) {
    if (isPostgres) {
      let paramIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      let queryWithReturn = pgSql;
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        queryWithReturn += ' RETURNING id';
      }
      const res = await pgPool.query(queryWithReturn, params);
      const lastID = res.rows && res.rows[0] ? res.rows[0].id : null;
      return { lastID, changes: res.rowCount };
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  },

  async exec(sql) {
    if (isPostgres) {
      await pgPool.query(sql);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  },

  initSchema() {
    if (isPostgres) {
      const pgSchemaPath = path.resolve(__dirname, '../../supabase/sql/migrations/20260805000000_create_quickdiag_tables.sql');
      if (fs.existsSync(pgSchemaPath)) {
        const sql = fs.readFileSync(pgSchemaPath, 'utf-8');
        return this.exec(sql);
      }
      return Promise.resolve();
    } else {
      let schemaPath = path.resolve(__dirname, 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.resolve(__dirname, '../../supabase/sql/schema.sql');
      }
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      return this.exec(sql);
    }
  }
};

module.exports = { db: sqliteDb || pgPool, query };
