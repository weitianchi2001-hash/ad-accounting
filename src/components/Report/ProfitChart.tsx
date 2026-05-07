import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  month?: string;
  income: number;
  expense: number;
  profit?: number;
}

interface Props {
  data: DataPoint[];
}

export default function ProfitChart({ data }: Props) {
  const chartData = data.map(d => ({
    ...d,
    profit: (d.profit ?? d.income) - d.expense,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
        />
        <Legend />
        <Bar dataKey="income" name="收入" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="利润" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
