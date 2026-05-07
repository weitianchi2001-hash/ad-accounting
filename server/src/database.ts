import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 5,
});

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  sql: string, params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T extends QueryResultRow = Record<string, unknown>>(
  sql: string, params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function run(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number; rowCount: number }> {
  const result = await pool.query(sql, params);
  // For INSERT...RETURNING id queries, the id is in result.rows[0]
  const lastInsertId = result.rows[0]?.id || 0;
  return { lastInsertId, rowCount: result.rowCount || 0 };
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    name TEXT NOT NULL,
    description TEXT,
    budget DECIMAL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT '进行中',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    amount DECIMAL NOT NULL,
    description TEXT,
    invoice_number TEXT,
    payment_date DATE,
    payment_method TEXT,
    size TEXT,
    status TEXT DEFAULT '未支付',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    amount DECIMAL NOT NULL,
    description TEXT,
    expense_date DATE,
    vendor TEXT,
    payment_method TEXT,
    size TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenues_client_id ON revenues(client_id);
CREATE INDEX IF NOT EXISTS idx_revenues_project_id ON revenues(project_id);
CREATE INDEX IF NOT EXISTS idx_revenues_payment_date ON revenues(payment_date);
CREATE INDEX IF NOT EXISTS idx_revenues_status ON revenues(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
`;

const SEED_CATEGORIES = [
  ['媒体投放', 'media_buying'],
  ['制作成本', 'production'],
  ['外包费用', 'outsourcing'],
  ['差旅交通', 'other'],
  ['办公费用', 'other'],
  ['其他支出', 'other'],
];

export async function initDatabase(): Promise<void> {
  // Run schema
  await pool.query(SCHEMA_SQL);

  // Seed categories if empty
  const countResult = await pool.query('SELECT COUNT(*) FROM expense_categories');
  if (parseInt(countResult.rows[0].count) === 0) {
    for (const [name, type] of SEED_CATEGORIES) {
      await pool.query('INSERT INTO expense_categories (name, type) VALUES ($1, $2)', [name, type]);
    }
  }

  console.log('Database initialized (PostgreSQL)');
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
}

// Export pool for direct access if needed
export { pool };
