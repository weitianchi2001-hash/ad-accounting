import { Router } from 'express';
import { query, queryOne } from '../database';

export const reportsRouter = Router();

reportsRouter.get('/dashboard/summary', async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const monthlyIncome = parseFloat((await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE payment_date >= $1 AND payment_date <= $2`,
      [monthStart, monthEnd]
    ))?.total || '0');

    const monthlyExpense = parseFloat((await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= $1 AND expense_date <= $2`,
      [monthStart, monthEnd]
    ))?.total || '0');

    const unpaidReceivables = parseFloat((await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE status = '未支付'`
    ))?.total || '0');

    // Monthly trend for last 12 months
    const trend: { month: string; income: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const mEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const inc = parseFloat((await queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE payment_date >= $1 AND payment_date <= $2`,
        [mStart, mEnd]
      ))?.total || '0');

      const exp = parseFloat((await queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= $1 AND expense_date <= $2`,
        [mStart, mEnd]
      ))?.total || '0');

      trend.push({ month: monthLabel, income: inc, expense: exp });
    }

    // Category breakdown for current month
    const categoryBreakdown = await query<{ name: string; amount: string }>(
      `SELECT ec.name, COALESCE(SUM(e.amount), 0) as amount
       FROM expense_categories ec
       LEFT JOIN expenses e ON ec.id = e.category_id
         AND e.expense_date >= $1 AND e.expense_date <= $2
       GROUP BY ec.id, ec.name
       ORDER BY amount DESC`,
      [monthStart, monthEnd]
    );

    res.json({
      success: true,
      data: {
        monthly_income: monthlyIncome,
        monthly_expense: monthlyExpense,
        net_profit: monthlyIncome - monthlyExpense,
        unpaid_receivables: unpaidReceivables,
        monthly_income_trend: trend,
        category_breakdown: categoryBreakdown.map(c => ({ name: c.name, amount: parseFloat(c.amount) })),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/profit-summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params: string[] = [];
    const paramsE: string[] = [];
    let i = 1, j = 1;
    let whereRevenue = "WHERE r.status = '已支付'";
    let whereExpense = 'WHERE 1=1';

    if (start_date) {
      whereRevenue += ` AND r.payment_date >= $${i++}`; params.push(String(start_date));
      whereExpense += ` AND e.expense_date >= $${j++}`; paramsE.push(String(start_date));
    }
    if (end_date) {
      whereRevenue += ` AND r.payment_date <= $${i++}`; params.push(String(end_date));
      whereExpense += ` AND e.expense_date <= $${j++}`; paramsE.push(String(end_date));
    }

    const summary = await query<{ month: string; income: string }>(
      `SELECT to_char(r.payment_date, 'YYYY-MM') as month, COALESCE(SUM(r.amount), 0) as income
       FROM revenues r ${whereRevenue}
       GROUP BY month ORDER BY month`,
      params
    );

    const expenseByMonth = await query<{ month: string; expense: string }>(
      `SELECT to_char(e.expense_date, 'YYYY-MM') as month, COALESCE(SUM(e.amount), 0) as expense
       FROM expenses e ${whereExpense}
       GROUP BY month ORDER BY month`,
      paramsE
    );

    const merged = new Map<string, { month: string; income: number; expense: number; profit: number }>();
    for (const s of summary) {
      if (s.month) merged.set(s.month, { month: s.month, income: parseFloat(s.income), expense: 0, profit: 0 });
    }
    for (const e of expenseByMonth) {
      if (e.month) {
        const existing = merged.get(e.month);
        if (existing) { existing.expense = parseFloat(e.expense); }
        else { merged.set(e.month, { month: e.month, income: 0, expense: parseFloat(e.expense), profit: 0 }); }
      }
    }
    for (const item of merged.values()) { item.profit = item.income - item.expense; }

    res.json({ success: true, data: Array.from(merged.values()) });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-project', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params: string[] = [];
    let whereR = '', whereE = '';
    let i = 1;

    if (start_date) { params.push(String(start_date)); whereR += ` AND r2.payment_date >= $${i}`; whereE += ` AND e2.expense_date >= $${i}`; i++; }
    if (end_date) { params.push(String(end_date)); whereR += ` AND r2.payment_date <= $${i}`; whereE += ` AND e2.expense_date <= $${i}`; i++; }

    // Duplicate params for both subqueries
    const allParams = [...params, ...params];

    const data = await query(
      `SELECT
        p.id as project_id, p.name as project_name, c.name as client_name,
        COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.project_id = p.id ${whereR}), 0) as income,
        COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id = p.id ${whereE}), 0) as expense,
        COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.project_id = p.id ${whereR}), 0) -
        COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id = p.id ${whereE}), 0) as profit
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       ORDER BY profit DESC`,
      allParams
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-client', async (_req, res) => {
  try {
    const data = await query(
      `SELECT
        cl.id as client_id, cl.name as client_name,
        COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.client_id = cl.id), 0) as income,
        COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id IN (SELECT id FROM projects WHERE client_id = cl.id)), 0) as expense,
        COALESCE((SELECT SUM(r2.amount) FROM revenues r2 WHERE r2.client_id = cl.id), 0) -
        COALESCE((SELECT SUM(e2.amount) FROM expenses e2 WHERE e2.project_id IN (SELECT id FROM projects WHERE client_id = cl.id)), 0) as profit
       FROM clients cl
       ORDER BY profit DESC`
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/by-category', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params: string[] = [];
    let where = '';
    let i = 1;
    if (start_date) { where += ` AND e.expense_date >= $${i++}`; params.push(String(start_date)); }
    if (end_date) { where += ` AND e.expense_date <= $${i++}`; params.push(String(end_date)); }

    const totalResult = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e WHERE 1=1 ${where}`, params
    );
    const grandTotal = parseFloat(totalResult?.total || '0');

    const data = await query<{ category_id: number; category_name: string; amount: string }>(
      `SELECT ec.id as category_id, ec.name as category_name, COALESCE(SUM(e.amount), 0) as amount
       FROM expense_categories ec
       LEFT JOIN expenses e ON ec.id = e.category_id ${where}
       GROUP BY ec.id, ec.name
       ORDER BY amount DESC`,
      params
    );

    const result = data.map(d => ({
      category_id: d.category_id,
      category_name: d.category_name,
      amount: parseFloat(d.amount),
      percentage: grandTotal > 0 ? Math.round((parseFloat(d.amount) / grandTotal) * 10000) / 100 : 0,
    }));

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

reportsRouter.get('/reports/aging', async (_req, res) => {
  try {
    const data = await query(
      `SELECT
        r.id as invoice_id, r.invoice_number,
        c.name as client_name, COALESCE(p.name, '无项目') as project_name,
        r.amount, r.payment_date,
        CAST(CURRENT_DATE - r.payment_date AS INTEGER) as days_overdue
       FROM revenues r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.status = '未支付'
       ORDER BY days_overdue DESC`
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
