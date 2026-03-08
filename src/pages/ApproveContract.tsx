import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, cn } from '../lib/utils';
import { Contract } from '../types';

export const ApproveContract = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    api.getContracts().then(setContracts);
  }, []);

  const handleAction = async (id: number, status: string) => {
    await api.updateContractStatus(id, status);
    setContracts(contracts.map(c => c.id === id ? { ...c, status: status as any } : c));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Duyệt hợp đồng</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-y border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HĐ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dự án</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">HD{String(c.id).padStart(4, '0')}</td>
                <td className="px-6 py-4 text-sm text-slate-900 font-semibold">{c.customer_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{c.property_title}</td>
                <td className="px-6 py-4 text-sm font-bold text-blue-600">{formatCurrency(c.total_value)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                    c.status === 'Chờ duyệt' ? "bg-amber-50 text-amber-600" : 
                    c.status === 'Đã duyệt' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {c.status === 'Chờ duyệt' && (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleAction(c.id, 'Đã duyệt')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleAction(c.id, 'Từ chối')}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <button className="ml-2 text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
