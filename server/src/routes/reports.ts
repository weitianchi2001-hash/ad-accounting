import { Router } from 'express';
import { all, get } from '../database';

export const reportsRouter = Router();

reportsRouter.get('/dashboard/summary', (_req, res) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

    const monthlyIncome = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE payment_date >= ? AND payment_date <= ?', [monthStart, monthEnd])?.total || 0;
    const monthlyExpense = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?', [monthStart, monthEnd])?.total || 0;
    const unpaidReceivables = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE status = ?', ['未支付'])?.total || 0;

    const trend: { month: string; income: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const me = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ld).padStart(2, '0')}`;
      const ml = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inc = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE payment_date >= ? AND payment_date <= ?', [ms, me])?.total || 0;
      const exp = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?', [ms, me])?.total || 0;
      trend.push({ month: ml, income: inc, expense: exp });
    }

    const categoryBreakdown = all<{ name: string; amount: number }>(
      `SELECT ec.name, COALESCE(SUM(e.amount), 0) as amount FROM expense_categories ec LEFT JOIN expenses e ON ec.id = e.category_id AND e.expense_date >= ? AND e.expense_date <= ? GROUP BY ec.id ORDER BY amount DESC`,
      [monthStart, monthEnd]
    );

    res.json({ success: true, data: { monthly_income: monthlyIncome, monthly_expense: monthlyExpense, net_profit: monthlyIncome - monthlyExpense, unpaid_receivables: unpaidReceivables, monthly_income_trend: trend, category_breakdown: categoryBreakdown } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/profit-summary', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let whereR = "WHERE r.status = '已支付'";
    let whereE = 'WHERE 1=1';
    const params: string[] = [];
    const paramsE: string[] = [];
    if (start_date) { whereR += ' AND r.payment_date >= ?'; params.push(String(start_date)); whereE += ' AND e.expense_date >= ?'; paramsE.push(String(start_date)); }
    if (end_date) { whereR += ' AND r.payment_date <= ?'; params.push(String(end_date)); whereE += ' AND e.expense_date <= ?'; paramsE.push(String(end_date)); }

    const summary = all<{ month: string; income: number }>(`SELECT strftime('%Y-%m', r.payment_date) as month, COALESCE(SUM(r.amount), 0) as income FROM revenues r ${whereR} GROUP BY month ORDER BY month`, params);
    const expenseByMonth = all<{ month: string; expense: number }>(`SELECT strftime('%Y-%m', e.expense_date) as month, COALESCE(SUM(e.amount), 0) as expense FROM expenses e ${whereE} GROUP BY month ORDER BY month`, paramsE);

    const merged = new Map<string, { month: string; income: number; expense: number; profit: number }>();
    for (const s of summary) { if (s.month) merged.set(s.month, { month: s.month, income: s.income, expense: 0, profit: 0 }); }
    for (const e of expenseByMonth) {
      if (e.month) { const ex = merged.get(e.month); if (ex) ex.expense = e.expense; else merged.set(e.month, { month: e.month, income: 0, expense: e.expense, profit: 0 }); }
    }
    for (const item of merged.values()) item.profit = item.income - item.expense;
    res.json({ success: true, data: Array.from(merged.values()) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-project', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let whereR = '', whereE = '';
    const params: string[] = [];
    const paramsE: string[] = [];
    if (start_date) { whereR += ' AND r2.payment_date >= ?'; params.push(String(start_date)); whereE += ' AND e2.expense_date >= ?'; paramsE.push(String(start_date)); }
    if (end_date) { whereR += ' AND r2.payment_date <= ?'; params.push(String(end_date)); whereE += ' AND e2.expense_date <= ?'; paramsE.push(String(end_date)); }

    const data = all(`SELECT p.id as project_id, p.name as project_name, c.name as client_name,
      (SELECT GROUP_CONCAT(DISTINCT cl.name) FROM revenues r3 LEFT JOIN clients cl ON r3.client_id = cl.id WHERE r3.project_id = p.id) as participant_clients,
      COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.project_id = p.id ${whereR}), 0) as income,
      COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id = p.id ${whereE}), 0) as expense,
      COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.project_id = p.id ${whereR}), 0) - COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id = p.id ${whereE}), 0) as profit
      FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY profit DESC`, [...params, ...paramsE]);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-client', (_req, res) => {
  try {
    const data = all(`SELECT cl.id as client_id, cl.name as client_name,
      COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.client_id = cl.id), 0) as income,
      COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id IN (SELECT id FROM projects WHERE client_id = cl.id)), 0) as expense,
      COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.client_id = cl.id), 0) - COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id IN (SELECT id FROM projects WHERE client_id = cl.id)), 0) as profit
      FROM clients cl ORDER BY profit DESC`);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-category', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let where = '';
    const params: string[] = [];
    if (start_date) { where += ' AND e.expense_date >= ?'; params.push(String(start_date)); }
    if (end_date) { where += ' AND e.expense_date <= ?'; params.push(String(end_date)); }

    const totalResult = get<{ total: number }>(`SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e WHERE 1=1 ${where}`, params);
    const grandTotal = totalResult?.total || 0;

    const data = all<{ category_id: number; category_name: string; amount: number }>(
      `SELECT ec.id as category_id, ec.name as category_name, COALESCE(SUM(e.amount), 0) as amount FROM expense_categories ec LEFT JOIN expenses e ON ec.id = e.category_id ${where} GROUP BY ec.id ORDER BY amount DESC`, params
    );
    const result = data.map(d => ({ ...d, percentage: grandTotal > 0 ? Math.round((d.amount / grandTotal) * 10000) / 100 : 0 }));
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/aging', (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = all(`SELECT r.id as invoice_id, r.invoice_number, c.name as client_name, COALESCE(p.name, '无项目') as project_name, r.amount, r.payment_date, CAST(julianday(?) - julianday(r.payment_date) AS INTEGER) as days_overdue FROM revenues r LEFT JOIN clients c ON r.client_id = c.id LEFT JOIN projects p ON r.project_id = p.id WHERE r.status = '未支付' ORDER BY days_overdue DESC`, [today]);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
