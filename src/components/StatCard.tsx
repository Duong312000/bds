import React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

export const StatCard = ({ label, value, icon: Icon, trend, color }: StatCardProps) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {trend && <p className="text-xs text-emerald-600 mt-2 font-medium">{trend}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);
