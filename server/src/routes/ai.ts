import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { all, get } from '../database';

const DATA_DIR = path.join(os.homedir(), 'Documents', '环宇视野记账');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

export const aiRouter = Router();

function getConfig(): { apiKey?: string } {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (_) {}
  return {};
}

function saveConfig(config: { apiKey?: string }) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}

async function callDeepSeek(apiKey: string, messages: { role: string; content: string }[]) {
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: 2000 }),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.choices[0].message.content;
}

// Get/set API key
aiRouter.get('/ai/config', (_req, res) => {
  const config = getConfig();
  res.json({ success: true, data: { hasKey: !!config.apiKey } });
});

aiRouter.post('/ai/config', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) { res.status(400).json({ success: false, error: 'API Key 不能为空' }); return; }
  saveConfig({ apiKey });
  res.json({ success: true });
});

// Build financial data summary for AI context
function buildDataSummary() {
  const totalRevenue = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM revenues')?.total || 0;
  const totalExpense = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses')?.total || 0;
  const unpaidTotal = get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE status = ?', ['未支付'])?.total || 0;
  const unpaidCount = get<{ count: number }>('SELECT COUNT(*) as count FROM revenues WHERE status = ?', ['未支付'])?.count || 0;

  const projectProfits = all(`SELECT p.name, p.status, p.budget,
    COALESCE((SELECT SUM(r.amount) FROM revenues r WHERE r.project_id = p.id), 0) as income,
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.project_id = p.id), 0) as expense
    FROM projects p ORDER BY income DESC LIMIT 10`);

  const clientStats = all(`SELECT c.name,
    COALESCE((SELECT SUM(r.amount) FROM revenues r WHERE r.client_id = c.id), 0) as income,
    COALESCE((SELECT SUM(r.amount) FROM revenues r WHERE r.client_id = c.id AND r.status = '未支付'), 0) as unpaid
    FROM clients c ORDER BY income DESC LIMIT 10`);

  const catBreakdown = all(`SELECT ec.name, COALESCE(SUM(e.amount), 0) as amount FROM expense_categories ec LEFT JOIN expenses e ON ec.id = e.category_id GROUP BY ec.id ORDER BY amount DESC`);

  const monthly = all(`SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as income FROM revenues WHERE status='已支付' GROUP BY month ORDER BY month DESC LIMIT 6`);
  const monthlyExp = all(`SELECT strftime('%Y-%m', expense_date) as month, SUM(amount) as expense FROM expenses GROUP BY month ORDER BY month DESC LIMIT 6`);

  return {
    summary: { totalRevenue, totalExpense, netProfit: totalRevenue - totalExpense, unpaidTotal, unpaidCount },
    projectProfits,
    clientStats,
    categoryBreakdown: catBreakdown,
    monthlyRevenue: monthly,
    monthlyExpense: monthlyExp,
  };
}

// Auto analysis
aiRouter.get('/ai/analyze', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.apiKey) { res.status(400).json({ success: false, error: '请先设置 DeepSeek API Key' }); return; }

    const data = buildDataSummary();

    const prompt = `你是一个环宇视野的财务分析专家。请根据以下数据进行分析，用中文回复，直接给出要点，不要客套话。

数据：
- 总收入：¥${data.summary.totalRevenue.toLocaleString()}
- 总支出：¥${data.summary.totalExpense.toLocaleString()}
- 净利润：¥${data.summary.netProfit.toLocaleString()}
- 未收账款：¥${data.summary.unpaidTotal.toLocaleString()}（${data.summary.unpaidCount}笔）

项目利润排名：
${JSON.stringify(data.projectProfits, null, 2)}

客户收入及欠款：
${JSON.stringify(data.clientStats, null, 2)}

支出类别分布：
${JSON.stringify(data.categoryBreakdown, null, 2)}

最近6个月收入/支出：
收入：${JSON.stringify(data.monthlyRevenue)}
支出：${JSON.stringify(data.monthlyExpense)}

请从以下四个维度分析（简洁，每个3-5句话）：
1. 利润趋势洞察
2. 客户风险评估
3. 成本优化建议
4. 总体健康度评分（满分10分）`;

    const analysis = await callDeepSeek(config.apiKey, [{ role: 'user', content: prompt }]);
    res.json({ success: true, data: { analysis } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// Chat query
aiRouter.post('/ai/chat', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.apiKey) { res.status(400).json({ success: false, error: '请先设置 DeepSeek API Key' }); return; }

    const { question } = req.body;
    if (!question) { res.status(400).json({ success: false, error: '请输入问题' }); return; }

    const data = buildDataSummary();

    const systemPrompt = `你是环宇视野记账系统的AI助手。以下是当前财务数据，请根据数据回答用户问题。用中文，简洁直接。

数据概览：
${JSON.stringify(data, null, 2)}`;

    const answer = await callDeepSeek(config.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]);
    res.json({ success: true, data: { answer } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});
