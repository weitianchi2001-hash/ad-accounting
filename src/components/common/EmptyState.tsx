import { FileText } from 'lucide-react';

interface Props {
  message?: string;
}

export default function EmptyState({ message = '暂无数据' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FileText size={48} />
      <p className="mt-4 text-sm">{message}</p>
    </div>
  );
}
