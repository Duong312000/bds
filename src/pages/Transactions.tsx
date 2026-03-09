import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  DollarSign, 
  User as UserIcon, 
  Building2,
  ChevronRight,
  Send,
  Check,
  X,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, cn } from '../lib/utils';
import { generateContractPDF } from '../lib/contractGenerator';
import { Reservation, Deposit, Contract, User } from '../types';

interface TransactionsProps {
  user: User | null;
}

export const Transactions = ({ user }: TransactionsProps) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'deposits' | 'contracts'>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [confirmDepositId, setConfirmDepositId] = useState<number | null>(null);

  const [confirmContractId, setConfirmContractId] = useState<{id: number, step: 'customer' | 'vendor'} | null>(null);

  const isAccountant = user?.role === 'accountant' || user?.role === 'manager' || user?.role === 'admin';
  const isSales = user?.role === 'sales' || user?.role === 'manager' || user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, depData, conData] = await Promise.all([
        api.getReservations(),
        api.getDeposits(),
        api.getContracts()
      ]);
      setReservations(resData);
      setDeposits(depData);
      setContracts(conData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDeposit = async (reservationId: number) => {
    setLoading(true);
    try {
      const res = await api.createDeposit({ reservation_id: reservationId, amount: 50000000 }); // Default deposit 50M
      if (res.success) {
        setNotification({ message: 'Xác nhận đặt cọc thành công! Hợp đồng đã được tạo.', type: 'success' });
        await fetchData();
        setConfirmDepositId(null);
      } else {
        setNotification({ message: res.message || 'Lỗi khi xác nhận đặt cọc', type: 'error' });
      }
    } catch (error) {
      console.error('Confirm deposit error:', error);
      setNotification({ message: 'Lỗi kết nối khi xác nhận đặt cọc', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmContract = async (contractId: number, step: 'customer' | 'vendor') => {
    setLoading(true);
    try {
      const res = await api.confirmContract(contractId, step, true);
      if (res.success) {
        setNotification({ message: `Xác nhận ${step === 'customer' ? 'khách hàng' : 'nhà cung cấp'} thành công!`, type: 'success' });
        await fetchData();
        setConfirmContractId(null);
      } else {
        setNotification({ message: res.message || 'Lỗi khi xác nhận hợp đồng', type: 'error' });
      }
    } catch (error) {
      console.error('Confirm contract error:', error);
      setNotification({ message: 'Lỗi kết nối khi xác nhận hợp đồng', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý giao dịch</h2>
          <p className="text-slate-500 text-sm">Theo dõi quy trình từ giữ chỗ đến hợp đồng chính thức</p>
        </div>
      </div>

      {notification && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reservations')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'reservations' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="w-4 h-4" /> Giữ chỗ ({reservations.length})
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'deposits' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <DollarSign className="w-4 h-4" /> Đặt cọc ({deposits.length})
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'contracts' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <FileText className="w-4 h-4" /> Hợp đồng ({contracts.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {activeTab === 'reservations' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã giữ chỗ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Căn hộ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hết hạn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{r.reservation_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{r.customer_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{r.property_title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(r.expires_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                      r.status === 'Active' ? "bg-emerald-100 text-emerald-700" : 
                      r.status === 'Converted' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {r.status === 'Active' ? 'Đang giữ' : r.status === 'Converted' ? 'Đã đặt cọc' : 'Hết hạn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === 'Active' ? (
                      isAccountant ? (
                        confirmDepositId === r.id ? (
                          <div className="flex items-center justify-end gap-2 animate-in fade-in zoom-in-95 duration-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Xác nhận tiền về?</span>
                            <button
                              onClick={() => handleConfirmDeposit(r.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {loading ? '...' : 'Có'}
                            </button>
                            <button
                              onClick={() => setConfirmDepositId(null)}
                              disabled={loading}
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300"
                            >
                              Không
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDepositId(r.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Xác nhận đặt cọc
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-amber-600 font-bold italic bg-amber-50 px-2 py-1 rounded border border-amber-100">
                          Đang đợi phê duyệt đặt cọc
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">Chưa có phiếu giữ chỗ nào</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'deposits' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Căn hộ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày đặt cọc</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-400">#DC{String(d.id).padStart(4, '0')}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-900">{d.customer_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{d.property_title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(d.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(d.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">Thành công</span>
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">Chưa có giao dịch đặt cọc nào</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'contracts' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp đồng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Căn hộ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Quy trình xác nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-slate-900">#HD{String(c.id).padStart(4, '0')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{c.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{c.property_title}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                      c.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {c.status === 'Draft' ? 'Chờ khách ký' : 
                       c.status === 'Customer_Confirmed' ? 'Chờ Vendor ký' : 
                       c.status === 'Completed' ? 'Hoàn tất' : c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-4">
                      {/* Step 1: Customer */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                          c.status !== 'Draft' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-300"
                        )}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Khách</span>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-slate-300" />

                      {/* Step 2: Vendor */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                          c.status === 'Completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-300"
                        )}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Vendor</span>
                      </div>

                      <div className="ml-4 flex gap-2">
                        {isSales && (
                          <button 
                            onClick={async () => {
                              try {
                                await generateContractPDF(c);
                              } catch (err) {
                                console.error('PDF generation failed:', err);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 flex items-center gap-2 transition-all border border-slate-200"
                            title="Xuất file PDF hợp đồng mẫu"
                          >
                            <Download className="w-3 h-3" /> Xuất HĐ
                          </button>
                        )}
                        {c.status === 'Draft' && isSales && (
                          confirmContractId?.id === c.id && confirmContractId?.step === 'customer' ? (
                            <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-lg border border-emerald-100">
                              <button onClick={() => handleConfirmContract(c.id, 'customer')} disabled={loading} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded">Có</button>
                              <button onClick={() => setConfirmContractId(null)} disabled={loading} className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">X</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmContractId({id: c.id, step: 'customer'})}
                              disabled={loading}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Khách ký
                            </button>
                          )
                        )}
                        {c.status === 'Customer_Confirmed' && isSales && (
                          confirmContractId?.id === c.id && confirmContractId?.step === 'vendor' ? (
                            <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-lg border border-emerald-100">
                              <button onClick={() => handleConfirmContract(c.id, 'vendor')} disabled={loading} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded">Có</button>
                              <button onClick={() => setConfirmContractId(null)} disabled={loading} className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">X</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmContractId({id: c.id, step: 'vendor'})}
                              disabled={loading}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Vendor ký
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">Chưa có hợp đồng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
