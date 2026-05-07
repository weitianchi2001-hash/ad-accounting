import { Router } from 'express';
import { query, queryOne, run } from '../database';

export const clientsRouter = Router();

clientsRouter.get('/clients', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM clients';
    const params: (string | number)[] = [];
    if (search) {
      sql += ' WHERE name ILIKE $1';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY id DESC';
    const clients = await query(sql, params);
    res.json({ success: true, data: clients });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.get('/clients/:id', async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!client) {
      res.status(404).json({ success: false, error: '客户不存在' });
      return;
    }
    res.json({ success: true, data: client });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.post('/clients', async (req, res) => {
  try {
    const { name, contact_info, notes } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: '客户名称不能为空' });
      return;
    }
    const result = await run(
      'INSERT INTO clients (name, contact_info, notes) VALUES ($1, $2, $3) RETURNING id',
      [name, contact_info || null, notes || null]
    );
    const client = await queryOne('SELECT * FROM clients WHERE id = $1', [result.lastInsertId]);
    res.json({ success: true, data: client });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.put('/clients/:id', async (req, res) => {
  try {
    const { name, contact_info, notes } = req.body;
    const existing = await queryOne('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '客户不存在' });
      return;
    }
    await run(
      'UPDATE clients SET name = $1, contact_info = $2, notes = $3 WHERE id = $4',
      [name || existing.name, contact_info ?? existing.contact_info, notes ?? existing.notes, req.params.id]
    );
    const updated = await queryOne('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.delete('/clients/:id', async (req, res) => {
  try {
    const projectCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM projects WHERE client_id = $1',
      [req.params.id]
    );
    if (projectCount && parseInt(projectCount.count) > 0) {
      res.status(400).json({ success: false, error: '该客户下存在项目，无法删除' });
      return;
    }
    const revenueCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM revenues WHERE client_id = $1 AND project_id IS NULL',
      [req.params.id]
    );
    if (revenueCount && parseInt(revenueCount.count) > 0) {
      res.status(400).json({ success: false, error: '该客户下存在收入记录，无法删除' });
      return;
    }
    await run('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
