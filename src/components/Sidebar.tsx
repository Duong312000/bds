import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  CreditCard, 
  BarChart3, 
  LogOut, 
  Plus, 
  Menu,
  X,
  User as UserIcon,
  ClipboardList,
  History as HistoryIcon,
  Home
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-4 py-3 text-sm font-medium transition-all rounded-xl mb-1 group relative",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-all", collapsed ? "mx-auto" : "mr-3")} />
    {!collapsed && <span className="truncate">{label}</span>}
    {collapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
        {label}
      </div>
    )}
  </button>
);

interface SidebarProps {
  user: User;
  view: string;
  setView: (view: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}

export const Sidebar = ({ user, view, setView, isSidebarOpen, setIsSidebarOpen, onLogout }: SidebarProps) => {
  return (
    <aside className={cn(
      "bg-white text-slate-900 transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-slate-100 shadow-sm",
      isSidebarOpen ? "w-64" : "w-20"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className={cn("flex items-center transition-opacity", isSidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-xl border border-slate-100 overflow-hidden p-1.5">
             <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M50 10L12 40V75C12 83.2843 18.7157 90 27 90H73C81.2843 90 88 83.2843 88 75V40L50 10Z" fill="#007AFF"/>
              <path d="M50 25L25 45V75C25 77.7614 27.2386 80 30 80H70C72.7614 80 75 77.7614 75 75V45L50 25Z" fill="white"/>
              <path d="M35 58C35 66.2843 41.7157 73 50 73C58.2843 73 65 66.2843 65 58" stroke="#007AFF" stroke-width="10" stroke-linecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-blue-600 leading-none">iHOUZZ</span>
            <span className="text-[8px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">BĐS HOUZZ UNI</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 mt-4 overflow-y-auto custom-scrollbar">
        <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} collapsed={!isSidebarOpen} />
        
        {(user.role === 'sales' || user.role === 'manager' || user.role === 'accountant') && (
          <>
            <SidebarItem icon={Users} label="Khách hàng" active={view === 'customers'} onClick={() => setView('customers')} collapsed={!isSidebarOpen} />
            <SidebarItem icon={ClipboardList} label="Quản lý yêu cầu" active={view === 'requests'} onClick={() => setView('requests')} collapsed={!isSidebarOpen} />
            <SidebarItem icon={Building2} label="Bất động sản" active={view === 'properties'} onClick={() => setView('properties')} collapsed={!isSidebarOpen} />
            <SidebarItem icon={HistoryIcon} label="Giao dịch" active={view === 'transactions'} onClick={() => setView('transactions')} collapsed={!isSidebarOpen} />
          </>
        )}

        {user.role === 'manager' && (
          <SidebarItem icon={Users} label="Nhân viên" active={view === 'users'} onClick={() => setView('users')} collapsed={!isSidebarOpen} />
        )}

        {(user.role === 'accountant' || user.role === 'manager') && (
          <>
            <SidebarItem icon={CreditCard} label="Thanh toán" active={view === 'payments'} onClick={() => setView('payments')} collapsed={!isSidebarOpen} />
            <SidebarItem icon={BarChart3} label="Báo cáo" active={view === 'reports'} onClick={() => setView('reports')} collapsed={!isSidebarOpen} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <div className="flex items-center p-2 mb-4 bg-slate-50 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-600/20">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-900">{user.username}</p>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">{user.role}</p>
            </div>
          )}
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          {isSidebarOpen && "Đăng xuất"}
        </button>
      </div>
    </aside>
  );
};
