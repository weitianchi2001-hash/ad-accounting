import { Router } from 'express';
import { query, queryOne, run } from '../database';

export const projectsRouter = Router();

projectsRouter.get('/projects', async (req, res) => {
  try {
    const { client_id, status } = req.query;
    let sql = `
      SELECT p.*, c.name as client_name,
        COALESCE((SELECT SUM(r.amount) FROM revenues r WHERE r.project_id = p.id), 0) as actual_income,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id = p.id), 0) as actual_expense
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let i = 1;
    if (client_id) {
      sql += ` AND p.client_id = $${i++}`;
      params.push(Number(client_id));
    }
    if (status) {
      sql += ` AND p.status = $${i++}`;
      params.push(String(status));
    }
    sql += ' ORDER BY p.created_at DESC';
    const projects = await query(sql, params);
    res.json({ success: true, data: projects });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.get('/projects/:id', async (req, res) => {
  try {
    const project = await queryOne(
      `SELECT p.*, c.name as client_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    res.json({ success: true, data: project });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.post('/projects', async (req, res) => {
  try {
    const { client_id, name, description, budget, start_date, end_date, status } = req.body;
    if (!client_id || !name) {
      res.status(400).json({ success: false, error: '客户和项目名称不能为空' });
      return;
    }
    const result = await run(
      `INSERT INTO projects (client_id, name, description, budget, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [client_id, name, description || null, budget || 0, start_date || null, end_date || null, status || '进行中']
    );
    const project = await queryOne(
      `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1`,
      [result.lastInsertId]
    );
    res.json({ success: true, data: project });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.put('/projects/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const { client_id, name, description, budget, start_date, end_date, status } = req.body;
    await run(
      `UPDATE projects SET client_id=$1, name=$2, description=$3, budget=$4, start_date=$5, end_date=$6, status=$7 WHERE id=$8`,
      [
        client_id || existing.client_id,
        name || existing.name,
        description ?? existing.description,
        budget ?? existing.budget,
        start_date ?? existing.start_date,
        end_date ?? existing.end_date,
        status || existing.status,
        req.params.id,
      ]
    );
    const updated = await queryOne(
      `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

projectsRouter.delete('/projects/:id', async (req, res) => {
  try {
    await run('UPDATE revenues SET project_id = NULL WHERE project_id = $1', [req.params.id]);
    await run('UPDATE expenses SET project_id = NULL WHERE project_id = $1', [req.params.id]);
    await run('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
