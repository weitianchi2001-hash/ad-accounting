import { Router } from 'express';
import { query, queryOne, run } from '../database';

export const expensesRouter = Router();

expensesRouter.get('/expenses', async (req, res) => {
  try {
    const { project_id, category_id, start_date, end_date, page, page_size } = req.query;
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let i = 1;

    if (project_id) { where += ` AND e.project_id = $${i++}`; params.push(Number(project_id)); }
    if (category_id) { where += ` AND e.category_id = $${i++}`; params.push(Number(category_id)); }
    if (start_date) { where += ` AND e.expense_date >= $${i++}`; params.push(String(start_date)); }
    if (end_date) { where += ` AND e.expense_date <= $${i++}`; params.push(String(end_date)); }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM expenses e ${where}`, params
    );
    const total = parseInt(countResult?.count || '0');

    const pg = Number(page) || 1;
    const ps = Number(page_size) || 20;
    const offset = (pg - 1) * ps;

    const list = await query(
      `SELECT e.*, c.name as category_name, p.name as project_name
       FROM expenses e
       LEFT JOIN expense_categories c ON e.category_id = c.id
       LEFT JOIN projects p ON e.project_id = p.id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, ps, offset]
    );

    res.json({ success: true, data: list, total, page: pg, page_size: ps });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.get('/expenses/:id', async (req, res) => {
  try {
    const expense = await queryOne(
      `SELECT e.*, c.name as category_name, p.name as project_name
       FROM expenses e
       LEFT JOIN expense_categories c ON e.category_id = c.id
       LEFT JOIN projects p ON e.project_id = p.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!expense) {
      res.status(404).json({ success: false, error: '支出记录不存在' });
      return;
    }
    res.json({ success: true, data: expense });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.post('/expenses', async (req, res) => {
  try {
    const { project_id, category_id, amount, description, expense_date, vendor, payment_method, size, notes } = req.body;
    if (!category_id || !amount) {
      res.status(400).json({ success: false, error: '支出类别和金额不能为空' });
      return;
    }
    const result = await run(
      `INSERT INTO expenses (project_id, category_id, amount, description, expense_date, vendor, payment_method, size, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [project_id || null, category_id, amount, description || null, expense_date || null, vendor || null, payment_method || null, size || null, notes || null]
    );
    const expense = await queryOne(
      `SELECT e.*, c.name as category_name, p.name as project_name
       FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = $1`,
      [result.lastInsertId]
    );
    res.json({ success: true, data: expense });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.put('/expenses/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '支出记录不存在' });
      return;
    }
    const { project_id, category_id, amount, description, expense_date, vendor, payment_method, size, notes } = req.body;
    await run(
      `UPDATE expenses SET project_id=$1, category_id=$2, amount=$3, description=$4, expense_date=$5, vendor=$6, payment_method=$7, size=$8, notes=$9 WHERE id=$10`,
      [
        project_id ?? existing.project_id, category_id || existing.category_id, amount ?? existing.amount,
        description ?? existing.description, expense_date ?? existing.expense_date,
        vendor ?? existing.vendor, payment_method ?? existing.payment_method,
        size ?? existing.size, notes ?? existing.notes, req.params.id,
      ]
    );
    const updated = await queryOne(
      `SELECT e.*, c.name as category_name, p.name as project_name
       FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

expensesRouter.delete('/expenses/:id', async (req, res) => {
  try {
    await run('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
