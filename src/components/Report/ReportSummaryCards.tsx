interface Props {
  cards: { label: string; value: number; color: string; prefix?: string }[];
}

export default function ReportSummaryCards({ cards }: Props) {
  const formatMoney = (v: number) => `${v < 0 ? '-' : ''}¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-2">{card.label}</p>
          <p className="text-2xl font-bold" style={{ color: card.color }}>
            {formatMoney(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
