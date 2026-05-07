import { Router } from 'express';
import { all, run } from '../database';

export const categoriesRouter = Router();

categoriesRouter.get('/categories', (_req, res) => {
  try {
    const categories = all('SELECT * FROM expense_categories ORDER BY id');
    res.json({ success: true, data: categories });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

categoriesRouter.post('/categories', (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name) { res.status(400).json({ success: false, error: '类别名称不能为空' }); return; }
    const result = run('INSERT INTO expense_categories (name, type) VALUES (?, ?)', [name, type || 'other']);
    const category = { id: result.lastInsertRowid, name, type: type || 'other', created_at: new Date().toISOString() };
    res.json({ success: true, data: category });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
