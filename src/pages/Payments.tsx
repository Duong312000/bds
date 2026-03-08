import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Payment, User } from '../types';

interface PaymentsProps {
  user: User | null;
}

export const Payments = ({ user }: PaymentsProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = () => {
    api.getPayments().then(setPayments);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    if (user?.role !== 'accountant' && user?.role !== 'manager') return;
    
    const newStatus = currentStatus === 'Đã thanh toán' ? 'Chưa thanh toán' : 'Đã thanh toán';
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Quản lý thanh toán</h2>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-y border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạn thanh toán</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dự án</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(p.due_date)}</td>
                <td className="px-6 py-4 text-sm text-slate-900 font-semibold">{p.customer_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.property_title}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                <td className="px-6 py-4">
                  <button 
                    disabled={loading || (user?.role !== 'accountant' && user?.role !== 'manager')}
                    onClick={() => handleUpdateStatus(p.id, p.status)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                      p.status === 'Đã thanh toán' 
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    )}
                  >
                    {p.status}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Xem hóa đơn">
                      <CreditCard className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
