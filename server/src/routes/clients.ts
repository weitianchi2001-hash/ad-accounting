import { Router } from 'express';
import { all, get, run } from '../database';
import { Client } from '../types';

export const clientsRouter = Router();

clientsRouter.get('/clients', (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM clients';
    const params: string[] = [];
    if (search) { sql += ' WHERE name LIKE ?'; params.push(`%${search}%`); }
    sql += ' ORDER BY id DESC';
    res.json({ success: true, data: all<Client>(sql, params) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.get('/clients/:id', (req, res) => {
  try {
    const client = get<Client>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) { res.status(404).json({ success: false, error: '客户不存在' }); return; }
    res.json({ success: true, data: client });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.post('/clients', (req, res) => {
  try {
    const { name, contact_info, notes } = req.body;
    if (!name) { res.status(400).json({ success: false, error: '客户名称不能为空' }); return; }
    const result = run('INSERT INTO clients (name, contact_info, notes) VALUES (?, ?, ?)', [name, contact_info || null, notes || null]);
    res.json({ success: true, data: get<Client>('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.put('/clients/:id', (req, res) => {
  try {
    const existing = get<Client>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ success: false, error: '客户不存在' }); return; }
    const { name, contact_info, notes } = req.body;
    run('UPDATE clients SET name = ?, contact_info = ?, notes = ? WHERE id = ?', [name || existing.name, contact_info ?? existing.contact_info, notes ?? existing.notes, req.params.id]);
    res.json({ success: true, data: get<Client>('SELECT * FROM clients WHERE id = ?', [req.params.id]) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

clientsRouter.delete('/clients/:id', (req, res) => {
  try {
    const pc = get<{ count: number }>('SELECT COUNT(*) as count FROM projects WHERE client_id = ?', [req.params.id]);
    if (pc && pc.count > 0) { res.status(400).json({ success: false, error: '该客户下存在项目，无法删除' }); return; }
    const rc = get<{ count: number }>('SELECT COUNT(*) as count FROM revenues WHERE client_id = ? AND project_id IS NULL', [req.params.id]);
    if (rc && rc.count > 0) { res.status(400).json({ success: false, error: '该客户下存在收入记录，无法删除' }); return; }
    run('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
