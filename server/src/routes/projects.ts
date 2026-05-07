import { Router } from 'express';
import { all, get, run } from '../database';
import { Project } from '../types';

export const projectsRouter = Router();

projectsRouter.get('/projects', (req, res) => {
  try {
    const { client_id, status } = req.query;
    let sql = `SELECT p.*, c.name as client_name,
      COALESCE((SELECT SUM(r.amount) FROM revenues r WHERE r.project_id = p.id), 0) as actual_income,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id = p.id), 0) as actual_expense
      FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE 1=1`;
    const params: (string | number)[] = [];
    if (client_id) { sql += ' AND p.client_id = ?'; params.push(Number(client_id)); }
    if (status) { sql += ' AND p.status = ?'; params.push(String(status)); }
    sql += ' ORDER BY p.created_at DESC';
    res.json({ success: true, data: all(sql, params) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.get('/projects/:id', (req, res) => {
  try {
    const project = get(`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`, [req.params.id]);
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return; }
    res.json({ success: true, data: project });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.post('/projects', (req, res) => {
  try {
    const { client_id, name, description, budget, start_date, end_date, status } = req.body;
    if (!name) { res.status(400).json({ success: false, error: '项目名称不能为空' }); return; }
    const result = run(
      'INSERT INTO projects (client_id, name, description, budget, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id || null, name, description || null, budget || 0, start_date || null, end_date || null, status || '进行中']
    );
    const project = get(`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`, [result.lastInsertRowid]);
    res.json({ success: true, data: project });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.put('/projects/:id', (req, res) => {
  try {
    const existing = get<Project>('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ success: false, error: '项目不存在' }); return; }
    const { client_id, name, description, budget, start_date, end_date, status } = req.body;
    run(
      'UPDATE projects SET client_id=?, name=?, description=?, budget=?, start_date=?, end_date=?, status=? WHERE id=?',
      [client_id !== undefined ? client_id : existing.client_id, name || existing.name, description ?? existing.description, budget ?? existing.budget, start_date ?? existing.start_date, end_date ?? existing.end_date, status || existing.status, req.params.id]
    );
    const updated = get(`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`, [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.delete('/projects/:id', (req, res) => {
  try {
    run('UPDATE revenues SET project_id = NULL WHERE project_id = ?', [req.params.id]);
    run('UPDATE expenses SET project_id = NULL WHERE project_id = ?', [req.params.id]);
    run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
