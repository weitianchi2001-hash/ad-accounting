import { Router } from 'express';
import { all, get, run } from '../database';
import { Revenue } from '../types';

export const revenuesRouter = Router();

revenuesRouter.get('/revenues', (req, res) => {
  try {
    const { client_id, project_id, status, start_date, end_date, page, page_size } = req.query;
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];
    if (client_id) { where += ' AND r.client_id = ?'; params.push(Number(client_id)); }
    if (project_id) { where += ' AND r.project_id = ?'; params.push(Number(project_id)); }
    if (status) { where += ' AND r.status = ?'; params.push(String(status)); }
    if (start_date) { where += ' AND r.payment_date >= ?'; params.push(String(start_date)); }
    if (end_date) { where += ' AND r.payment_date <= ?'; params.push(String(end_date)); }

    const countResult = get<{ count: number }>(`SELECT COUNT(*) as count FROM revenues r ${where}`, params);
    const total = countResult?.count || 0;
    const pg = Number(page) || 1;
    const ps = Number(page_size) || 20;
    const offset = (pg - 1) * ps;

    const list = all(
      `SELECT r.*, c.name as client_name, p.name as project_name FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );
    res.json({ success: true, data: list, total, page: pg, page_size: ps });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.get('/revenues/:id', (req, res) => {
  try {
    const revenue = get(`SELECT r.*, c.name as client_name, p.name as project_name FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id WHERE r.id = ?`, [req.params.id]);
    if (!revenue) { res.status(404).json({ success: false, error: '收入记录不存在' }); return; }
    res.json({ success: true, data: revenue });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.post('/revenues', (req, res) => {
  try {
    const { project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, square_meters, status, notes } = req.body;
    if (!client_id || !amount) { res.status(400).json({ success: false, error: '客户和金额不能为空' }); return; }
    const result = run(
      `INSERT INTO revenues (project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, square_meters, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id || null, client_id, amount, description || null, invoice_number || null, payment_date || null, payment_method || null, size || null, square_meters || 0, status || '未支付', notes || null]
    );
    const revenue = get(`SELECT r.*, c.name as client_name, p.name as project_name FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id WHERE r.id = ?`, [result.lastInsertRowid]);
    res.json({ success: true, data: revenue });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.put('/revenues/:id', (req, res) => {
  try {
    const existing = get<Revenue>('SELECT * FROM revenues WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ success: false, error: '收入记录不存在' }); return; }
    const { project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, square_meters, status, notes } = req.body;
    run(
      `UPDATE revenues SET project_id=?, client_id=?, amount=?, description=?, invoice_number=?, payment_date=?, payment_method=?, size=?, square_meters=?, status=?, notes=? WHERE id=?`,
      [project_id ?? existing.project_id, client_id || existing.client_id, amount ?? existing.amount, description ?? existing.description, invoice_number ?? existing.invoice_number, payment_date ?? existing.payment_date, payment_method ?? existing.payment_method, size ?? existing.size, square_meters ?? existing.square_meters, status || existing.status, notes ?? existing.notes, req.params.id]
    );
    const updated = get(`SELECT r.*, c.name as client_name, p.name as project_name FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id WHERE r.id = ?`, [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.delete('/revenues/:id', (req, res) => {
  try {
    run('DELETE FROM revenues WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
