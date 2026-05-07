interface Props {
  status: string;
}

const statusColors: Record<string, string> = {
  '已支付': 'bg-green-100 text-green-700',
  '未支付': 'bg-yellow-100 text-yellow-700',
  '进行中': 'bg-blue-100 text-blue-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }: Props) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
