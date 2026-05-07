import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, CreditCard,
  Users, FolderKanban, BarChart3, Brain,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { to: '/revenues', label: '收入管理', icon: Receipt },
  { to: '/expenses', label: '支出管理', icon: CreditCard },
  { to: '/clients', label: '客户管理', icon: Users },
  { to: '/projects', label: '项目管理', icon: FolderKanban },
  { to: '/reports', label: '利润分析', icon: BarChart3 },
  { to: '/ai', label: 'AI 分析', icon: Brain },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-800 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-wide">广告记账</h1>
        <p className="text-xs text-slate-400 mt-1">广告公司记账系统</p>
      </div>
      <nav className="flex-1 py-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white border-r-2 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
