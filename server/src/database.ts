import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'accounting.db');

let db: SqlJsDatabase;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDb(): SqlJsDatabase {
  return db;
}

export function run(sql: string, params: unknown[] = []) {
  db.run(sql, params);
  saveDb();
  const result = db.exec('SELECT last_insert_rowid()');
  const lastInsertRowid = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  return { lastInsertRowid, changes: db.getRowsModified() };
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const rows = all<T>(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    budget REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT '进行中',
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS revenues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    client_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    invoice_number TEXT,
    payment_date TEXT,
    payment_method TEXT,
    size TEXT,
    square_meters REAL DEFAULT 0,
    status TEXT DEFAULT '未支付',
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    expense_date TEXT,
    vendor TEXT,
    payment_method TEXT,
    size TEXT,
    square_meters REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
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
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
  for (const stmt of statements) db.run(stmt + ';');

  // Migration: add size if missing
  try { db.run('ALTER TABLE revenues ADD COLUMN size TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE expenses ADD COLUMN size TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE revenues ADD COLUMN square_meters REAL DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE expenses ADD COLUMN square_meters REAL DEFAULT 0'); } catch (_) {}

  // Migration: make projects.client_id nullable (for multi-client projects)
  try {
    const info = db.exec('PRAGMA table_info(projects)');
    if (info.length > 0) {
      const clientIdCol = info[0].values.find((row: unknown[]) => row[1] === 'client_id');
      if (clientIdCol && clientIdCol[3] === 1) {
        // client_id has NOT NULL (notnull=1), need to migrate
        db.run('PRAGMA foreign_keys = OFF');
        db.run('CREATE TABLE projects_new (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, name TEXT NOT NULL, description TEXT, budget REAL DEFAULT 0, start_date TEXT, end_date TEXT, status TEXT DEFAULT \'进行中\', created_at DATETIME DEFAULT (datetime(\'now\', \'localtime\')))');
        db.run('INSERT INTO projects_new SELECT id, client_id, name, description, budget, start_date, end_date, status, created_at FROM projects');
        db.run('DROP TABLE projects');
        db.run('ALTER TABLE projects_new RENAME TO projects');
        db.run('PRAGMA foreign_keys = ON');
        console.log('Migrated projects table: client_id now nullable');
      }
    }
  } catch (_) { /* skip if migration fails */ }

  const countResult = db.exec('SELECT COUNT(*) as count FROM expense_categories');
  const count = countResult[0]?.values[0][0] as number;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO expense_categories (name, type) VALUES (?, ?)');
    for (const [name, type] of SEED_CATEGORIES) insert.run([name, type]);
    insert.free();
  }

  saveDb();
  console.log('Database ready:', DB_PATH);
}
