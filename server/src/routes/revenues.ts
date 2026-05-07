import { Router } from 'express';
import { query, queryOne, run } from '../database';

export const revenuesRouter = Router();

revenuesRouter.get('/revenues', async (req, res) => {
  try {
    const { client_id, project_id, status, start_date, end_date, page, page_size } = req.query;
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let i = 1;

    if (client_id) { where += ` AND r.client_id = $${i++}`; params.push(Number(client_id)); }
    if (project_id) { where += ` AND r.project_id = $${i++}`; params.push(Number(project_id)); }
    if (status) { where += ` AND r.status = $${i++}`; params.push(String(status)); }
    if (start_date) { where += ` AND r.payment_date >= $${i++}`; params.push(String(start_date)); }
    if (end_date) { where += ` AND r.payment_date <= $${i++}`; params.push(String(end_date)); }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM revenues r ${where}`, params
    );
    const total = parseInt(countResult?.count || '0');

    const pg = Number(page) || 1;
    const ps = Number(page_size) || 20;
    const offset = (pg - 1) * ps;

    const list = await query(
      `SELECT r.*, c.name as client_name, p.name as project_name
       FROM revenues r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN projects p ON r.project_id = p.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, ps, offset]
    );

    res.json({ success: true, data: list, total, page: pg, page_size: ps });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.get('/revenues/:id', async (req, res) => {
  try {
    const revenue = await queryOne(
      `SELECT r.*, c.name as client_name, p.name as project_name
       FROM revenues r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!revenue) {
      res.status(404).json({ success: false, error: '收入记录不存在' });
      return;
    }
    res.json({ success: true, data: revenue });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.post('/revenues', async (req, res) => {
  try {
    const { project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, status, notes } = req.body;
    if (!client_id || !amount) {
      res.status(400).json({ success: false, error: '客户和金额不能为空' });
      return;
    }
    const result = await run(
      `INSERT INTO revenues (project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [project_id || null, client_id, amount, description || null, invoice_number || null, payment_date || null, payment_method || null, size || null, status || '未支付', notes || null]
    );
    const revenue = await queryOne(
      `SELECT r.*, c.name as client_name, p.name as project_name
       FROM revenues r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [result.lastInsertId]
    );
    res.json({ success: true, data: revenue });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.put('/revenues/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM revenues WHERE id = $1', [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '收入记录不存在' });
      return;
    }
    const { project_id, client_id, amount, description, invoice_number, payment_date, payment_method, size, status, notes } = req.body;
    await run(
      `UPDATE revenues SET project_id=$1, client_id=$2, amount=$3, description=$4, invoice_number=$5, payment_date=$6, payment_method=$7, size=$8, status=$9, notes=$10 WHERE id=$11`,
      [
        project_id ?? existing.project_id, client_id || existing.client_id, amount ?? existing.amount,
        description ?? existing.description, invoice_number ?? existing.invoice_number,
        payment_date ?? existing.payment_date, payment_method ?? existing.payment_method,
        size ?? existing.size, status || existing.status, notes ?? existing.notes, req.params.id,
      ]
    );
    const updated = await queryOne(
      `SELECT r.*, c.name as client_name, p.name as project_name
       FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id WHERE r.id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

revenuesRouter.delete('/revenues/:id', async (req, res) => {
  try {
    await run('DELETE FROM revenues WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
