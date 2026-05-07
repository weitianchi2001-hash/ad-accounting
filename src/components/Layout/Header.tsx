import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/revenues': '收入管理',
  '/expenses': '支出管理',
  '/clients': '客户管理',
  '/projects': '项目管理',
  '/reports': '利润分析',
};

export default function Header() {
  const location = useLocation();
  const title = titles[location.pathname] || '';

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    </header>
  );
}
