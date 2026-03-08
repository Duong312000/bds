import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, User as UserIcon, Users, Shield } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { OwnershipRequest, User as UserType } from '../types';

interface RequestsProps {
  user: UserType | null;
}

export const Requests = ({ user }: RequestsProps) => {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      window.alert('Global Error: ' + e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  console.log('Requests component rendering, user:', user?.username, 'role:', user?.role);
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  console.log('Current loading state:', loading);
  const [activeTab, setActiveTab] = useState<'customers' | 'accounts'>('customers');
  const [confirmRejectId, setConfirmRejectId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const fetchRequests = () => {
    api.getRequests().then(setRequests);
  };

  const fetchPendingUsers = () => {
    api.getUsers().then(users => {
      setPendingUsers(users.filter(u => !u.approved));
    });
  };

  useEffect(() => {
    fetchRequests();
    if (user?.role === 'manager' || user?.role === 'admin') {
      fetchPendingUsers();
    }
  }, [user]);

  const handleAction = async (id: number, status: 'Approved' | 'Rejected') => {
    if (!user) return;
    setLoading(true);
    const res = await api.updateRequestStatus(id, status, user.id);
    if (res.success) {
      fetchRequests();
    }
    setLoading(false);
  };

  const handleApproveUser = async (id: number) => {
    setLoading(true);
    const res = await api.approveUser(id);
    if (res.success) {
      fetchPendingUsers();
    }
    setLoading(false);
  };

  const handleRejectUser = async (id: number) => {
    console.log('Executing rejection for user ID:', id);
    setLoading(true);
    try {
      const res = await api.deleteUser(id);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Đã từ chối và xóa tài khoản thành công' });
        fetchPendingUsers();
      } else {
        setStatusMsg({ type: 'error', text: 'Lỗi: ' + ((res as any).message || 'Không xác định') });
      }
    } catch (err) {
      console.error('Reject error:', err);
      setStatusMsg({ type: 'error', text: 'Lỗi kết nối khi từ chối tài khoản' });
    } finally {
      setLoading(false);
      setConfirmRejectId(null);
    }
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const displayRequests = isManager ? requests : requests.filter(r => r.request_by === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Quản lý yêu cầu</h2>
      </div>

      {statusMsg && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4",
          statusMsg.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
        )}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{statusMsg.text}</span>
        </div>
      )}

      {isManager && (
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('customers')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'customers' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Yêu cầu khách hàng ({displayRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === 'accounts' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Duyệt tài khoản ({pendingUsers.length})
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'customers' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại yêu cầu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người phụ trách hiện tại</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người yêu cầu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày yêu cầu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  {isManager && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        r.type === 'Deletion' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {r.type === 'Deletion' ? 'Xóa khách' : 'Phân quyền'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{r.customer_name}</div>
                      <div className="text-xs text-slate-500">ID: KH{String(r.customer_id).padStart(4, '0')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {r.current_owner_name || <span className="text-slate-400 italic">Chưa có</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <UserIcon className="w-4 h-4 mr-2 text-slate-400" />
                        {r.requester_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={cn(
                          "flex items-center w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                          r.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                          r.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                          "bg-red-50 text-red-600"
                        )}>
                          {r.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                          {r.status === 'Approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {r.status === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {r.status === 'Pending' ? 'Chờ duyệt' : r.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                        {r.status !== 'Pending' && r.processor_name && (
                          <div className="text-[10px] text-slate-400 italic">
                            Bởi: {r.processor_name}
                          </div>
                        )}
                      </div>
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 text-right">
                        {r.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              disabled={loading}
                              onClick={() => handleAction(r.id, 'Rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button 
                              disabled={loading}
                              onClick={() => handleAction(r.id, 'Approved')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Duyệt"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {displayRequests.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="px-6 py-12 text-center text-slate-500 italic">
                      Chưa có yêu cầu nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingUsers.map((u) => {
                  console.log('Rendering pending user:', u.username, 'ID:', u.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        u.role === 'sales' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        <Shield className="w-3 h-3 mr-1" />
                        {u.role === 'sales' ? 'Sales' : 'Kế toán'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Chờ duyệt
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {confirmRejectId === u.id ? (
                          <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100">
                            <span className="text-[10px] font-bold text-red-700 px-2">Xóa?</span>
                            <button
                              onClick={() => handleRejectUser(u.id)}
                              className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700"
                            >
                              Có
                            </button>
                            <button
                              onClick={() => setConfirmRejectId(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300"
                            >
                              Không
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmRejectId(u.id);
                              }}
                              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                            >
                              Từ chối
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleApproveUser(u.id)}
                              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
                            >
                              Duyệt tài khoản
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                      Không có tài khoản nào đang chờ duyệt
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
