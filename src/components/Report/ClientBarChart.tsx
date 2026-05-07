import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  client_name: string;
  income: number;
  profit: number;
}

interface Props {
  data: DataPoint[];
}

export default function ClientBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="client_name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
        />
        <Legend />
        <Bar dataKey="income" name="收入" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="利润" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
