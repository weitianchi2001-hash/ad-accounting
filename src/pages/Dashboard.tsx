import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchReportByProject } from '../api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReportSummaryCards from '../components/Report/ReportSummaryCards';
import ProfitChart from '../components/Report/ProfitChart';
import ExpensePieChart from '../components/Report/ExpensePieChart';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardSummary,
  });

  // Fetch project expenses for pie chart (current month implied by no date filter = all time)
  const { data: projectData } = useQuery({
    queryKey: ['reports', 'by-project', {}],
    queryFn: () => fetchReportByProject({}),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const cards = [
    { label: '本月收入', value: data.monthly_income, color: '#16a34a' },
    { label: '本月支出', value: data.monthly_expense, color: '#dc2626' },
    { label: '本月利润', value: data.net_profit, color: data.net_profit >= 0 ? '#2563eb' : '#dc2626' },
    { label: '未收账款', value: data.unpaid_receivables, color: '#d97706' },
  ];

  const trendData = data.monthly_income_trend.map(t => ({
    month: t.month,
    income: t.income,
    expense: t.expense,
    profit: t.income - t.expense,
  }));

  const projectExpenses = (projectData || []).filter(p => p.expense > 0).map(p => ({
    name: p.project_name,
    amount: p.expense,
  }));

  return (
    <div>
      <ReportSummaryCards cards={cards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">近12个月收支趋势</h3>
          <ProfitChart data={trendData} />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">支出按项目统计</h3>
          <ExpensePieChart data={projectExpenses} />
        </div>
      </div>
    </div>
  );
}
