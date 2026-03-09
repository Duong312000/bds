import React from 'react';
import { 
  AreaChart, 
  ComposedChart,
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Line
} from 'recharts';
import { formatCurrency } from '../lib/utils';

interface ChartRevenueProps {
  data: any[];
}

export const ChartRevenue = ({ data }: ChartRevenueProps) => {
  return (
    <div className="h-[350px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `${v/1000000}M`} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            formatter={(v: any, name: string) => name === 'Doanh thu' ? formatCurrency(v) : v}
          />
          <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
          <Area yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu" stroke="#007AFF" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
          <Line yAxisId="right" type="monotone" dataKey="contracts" name="Hợp đồng" stroke="#FF8A00" strokeWidth={2} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
