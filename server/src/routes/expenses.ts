import { Router } from 'express';
import { all, get, run } from '../database';
import { Expense } from '../types';

export const expensesRouter = Router();

expensesRouter.get('/expenses', (req, res) => {
  try {
    const { project_id, category_id, start_date, end_date, page, page_size } = req.query;
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];
    if (project_id) { where += ' AND e.project_id = ?'; params.push(Number(project_id)); }
    if (category_id) { where += ' AND e.category_id = ?'; params.push(Number(category_id)); }
    if (start_date) { where += ' AND e.expense_date >= ?'; params.push(String(start_date)); }
    if (end_date) { where += ' AND e.expense_date <= ?'; params.push(String(end_date)); }

    const countResult = get<{ count: number }>(`SELECT COUNT(*) as count FROM expenses e ${where}`, params);
    const total = countResult?.count || 0;
    const pg = Number(page) || 1;
    const ps = Number(page_size) || 20;
    const offset = (pg - 1) * ps;

    const list = all(
      `SELECT e.*, c.name as category_name, p.name as project_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );
    res.json({ success: true, data: list, total, page: pg, page_size: ps });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.get('/expenses/:id', (req, res) => {
  try {
    const expense = get(`SELECT e.*, c.name as category_name, p.name as project_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = ?`, [req.params.id]);
    if (!expense) { res.status(404).json({ success: false, error: '支出记录不存在' }); return; }
    res.json({ success: true, data: expense });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.post('/expenses', (req, res) => {
  try {
    const { project_id, category_id, amount, description, expense_date, vendor, payment_method, size, square_meters, notes } = req.body;
    if (!category_id || !amount) { res.status(400).json({ success: false, error: '支出类别和金额不能为空' }); return; }
    const result = run(
      `INSERT INTO expenses (project_id, category_id, amount, description, expense_date, vendor, payment_method, size, square_meters, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id || null, category_id, amount, description || null, expense_date || null, vendor || null, payment_method || null, size || null, square_meters || 0, notes || null]
    );
    const expense = get(`SELECT e.*, c.name as category_name, p.name as project_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = ?`, [result.lastInsertRowid]);
    res.json({ success: true, data: expense });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.put('/expenses/:id', (req, res) => {
  try {
    const existing = get<Expense>('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ success: false, error: '支出记录不存在' }); return; }
    const { project_id, category_id, amount, description, expense_date, vendor, payment_method, size, square_meters, notes } = req.body;
    run(
      `UPDATE expenses SET project_id=?, category_id=?, amount=?, description=?, expense_date=?, vendor=?, payment_method=?, size=?, square_meters=?, notes=? WHERE id=?`,
      [project_id ?? existing.project_id, category_id || existing.category_id, amount ?? existing.amount, description ?? existing.description, expense_date ?? existing.expense_date, vendor ?? existing.vendor, payment_method ?? existing.payment_method, size ?? existing.size, square_meters ?? existing.square_meters, notes ?? existing.notes, req.params.id]
    );
    const updated = get(`SELECT e.*, c.name as category_name, p.name as project_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = ?`, [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.delete('/expenses/:id', (req, res) => {
  try {
    run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
