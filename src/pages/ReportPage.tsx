import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchProfitSummary, fetchReportByProject,
  fetchReceivablesAging,
} from '../api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReportSummaryCards from '../components/Report/ReportSummaryCards';
import ProfitChart from '../components/Report/ProfitChart';
import ExpensePieChart from '../components/Report/ExpensePieChart';
import StatusBadge from '../components/common/StatusBadge';

export default function ReportPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tab, setTab] = useState<'project' | 'aging'>('project');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [startDate, endDate]);

  const { data: summary, isLoading: loading1 } = useQuery({
    queryKey: ['reports', 'profit-summary', params],
    queryFn: () => fetchProfitSummary(params),
  });

  const { data: byProject, isLoading: loading2 } = useQuery({
    queryKey: ['reports', 'by-project', params],
    queryFn: () => fetchReportByProject(params),
  });

  const { data: aging, isLoading: loading5 } = useQuery({
    queryKey: ['reports', 'aging'],
    queryFn: fetchReceivablesAging,
  });

  const isLoading = loading1 || loading2 || loading5;

  const totalIncome = summary?.reduce((s, m) => s + m.income, 0) || 0;
  const totalExpense = summary?.reduce((s, m) => s + m.expense, 0) || 0;
  const totalProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 10000) / 100 : 0;

  const formatMoney = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <span className="text-gray-400">—</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-3 py-2 text-sm text-blue-500 hover:bg-blue-50 rounded-lg">清除筛选</button>
      </div>

      <ReportSummaryCards
        cards={[
          { label: '总收入', value: totalIncome, color: '#16a34a' },
          { label: '总支出', value: totalExpense, color: '#dc2626' },
          { label: '净利润', value: totalProfit, color: totalProfit >= 0 ? '#2563eb' : '#dc2626' },
          { label: '毛利率', value: margin, color: '#7c3aed', prefix: '%' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">月度利润趋势</h3>
          <ProfitChart data={summary || []} />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">支出按项目统计</h3>
          <ExpensePieChart data={(byProject || []).filter(p => p.expense > 0).map(p => ({ name: p.project_name, amount: p.expense }))} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <button
            onClick={() => setTab('project')}
            className={`px-6 py-3 text-sm font-medium ${tab === 'project' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            按项目利润
          </button>
          <button
            onClick={() => setTab('aging')}
            className={`px-6 py-3 text-sm font-medium ${tab === 'aging' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            应收账款
          </button>
        </div>

        {tab === 'project' && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">项目</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">收入</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">支出</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">利润</th>
              </tr>
            </thead>
            <tbody>
              {(byProject || []).map(p => (
                <tr key={p.project_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium">{p.project_name}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600">{formatMoney(p.income)}</td>
                  <td className="px-6 py-3 text-sm text-right text-red-500">{formatMoney(p.expense)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium" style={{ color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatMoney(p.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'aging' && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">发票号</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">客户</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">项目</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">金额</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">到期日</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">逾期天数</th>
              </tr>
            </thead>
            <tbody>
              {(aging || []).map(a => (
                <tr key={a.invoice_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-500">{a.invoice_number || '-'}</td>
                  <td className="px-6 py-3 text-sm">{a.client_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{a.project_name}</td>
                  <td className="px-6 py-3 text-sm text-right text-yellow-600 font-medium">{formatMoney(a.amount)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{a.payment_date || '-'}</td>
                  <td className="px-6 py-3 text-sm text-right">
                    <StatusBadge status={a.days_overdue > 0 ? `逾期${a.days_overdue}天` : '未到期'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
