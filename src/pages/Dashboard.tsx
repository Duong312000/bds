import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  CreditCard, 
  BarChart3, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { ChartRevenue } from '../components/ChartRevenue';
import { api } from '../services/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { DashboardStats, Activity, Contract, Property } from '../types';

const COLORS = ['#007AFF', '#FF8A00', '#059669', '#7c3aed', '#ea580c'];

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);

  useEffect(() => {
    api.getStats().then(setStats);
    api.getActivities().then(setActivities);
    api.getContracts().then(data => setRecentContracts(data.slice(0, 5)));
    api.getProperties().then(data => setRecentProperties(data.slice(0, 3)));
  }, []);

  if (!stats) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Hệ thống quản lý kinh doanh bất động sản chuyên nghiệp.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center">
            <Clock className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-sm font-bold text-slate-700">{stats.pendingContracts} chờ duyệt</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center">
            <Users className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-bold text-slate-700">{stats.newCustomers} khách mới</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Hợp đồng tháng này" 
          value={stats.monthlyContracts} 
          icon={FileText} 
          trend="+12% so với tháng trước"
          color="bg-brand-blue"
        />
        <StatCard 
          label="Doanh thu thực tế" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={BarChart3} 
          trend="+5.4% so với tháng trước"
          color="bg-emerald-600"
        />
        <StatCard 
          label="Giá trị giao dịch" 
          value={formatCurrency(stats.totalTransactionValue)} 
          icon={CreditCard} 
          color="bg-brand-orange"
        />
        <StatCard 
          label="Tỷ lệ chuyển đổi" 
          value={`${stats.conversionRate}%`} 
          icon={CheckCircle2} 
          trend="Khách -> Hợp đồng"
          color="bg-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Khách hàng mới" 
          value={stats.newCustomers} 
          icon={Users} 
          color="bg-slate-700"
        />
        <StatCard 
          label="BĐS đang bán" 
          value={stats.propertiesForSale} 
          icon={Building2} 
          color="bg-cyan-600"
        />
        <StatCard 
          label="BĐS đã bán" 
          value={stats.propertiesSold} 
          icon={CheckCircle2} 
          color="bg-emerald-500"
        />
        <StatCard 
          label="Hợp đồng chờ duyệt" 
          value={stats.pendingContracts} 
          icon={Clock} 
          color="bg-amber-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Doanh thu & Hợp đồng</h3>
            <select className="text-xs font-bold text-slate-500 bg-slate-50 border-none rounded-lg px-3 py-1 outline-none">
              <option>6 tháng gần nhất</option>
              <option>Năm nay</option>
            </select>
          </div>
          <ChartRevenue data={stats.revenueByMonth} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Phân loại BĐS</h3>
          <div className="h-[300px] min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.propertyTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.propertyTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats?.propertyTypeDistribution.map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: COLORS[idx % COLORS.length]}} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Contracts Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Hợp đồng mới nhất</h3>
            <button className="text-sm font-bold text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khách hàng</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dự án</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá trị</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{c.customer_name}</p>
                      <p className="text-[10px] text-slate-400">#HD{String(c.id).padStart(4, '0')}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.property_title}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{formatCurrency(c.total_value)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        c.status === 'Draft' ? "bg-amber-50 text-amber-600" : 
                        c.status === 'Customer_Confirmed' ? "bg-blue-50 text-blue-600" :
                        c.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {c.status === 'Draft' ? 'Chờ khách ký' : 
                         c.status === 'Customer_Confirmed' ? 'Chờ Vendor ký' : 
                         c.status === 'Completed' ? 'Hoàn tất' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Hoạt động gần đây</h3>
          <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 shadow-sm",
                  activity.type === 'contract' ? "bg-blue-50 text-blue-600" :
                  activity.type === 'customer' ? "bg-emerald-50 text-emerald-600" :
                  activity.type === 'payment' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                )}>
                  {activity.type === 'contract' ? <FileText className="w-4 h-4" /> :
                   activity.type === 'customer' ? <Users className="w-4 h-4" /> :
                   activity.type === 'payment' ? <CreditCard className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 leading-snug">{activity.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Properties Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Bất động sản mới đăng</h3>
          <button className="text-sm font-bold text-blue-600 hover:underline">Xem tất cả</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentProperties.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
              <div className="relative h-32 overflow-hidden">
                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[9px] font-bold text-blue-600 uppercase">
                    {p.type}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase",
                    p.listing_type === 'Bán' ? "bg-blue-600" : "bg-purple-600"
                  )}>
                    {p.listing_type}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{p.title}</h4>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs font-black text-blue-600">{formatCurrency(p.price)}</p>
                  <p className="text-[10px] text-slate-400">{p.area} m²</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
