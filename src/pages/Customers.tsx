import React, { useState, useEffect } from 'react';
import { Search, Plus, X, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { Customer, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CustomersProps {
  user: User | null;
}

export const Customers = ({ user }: CustomersProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [assigningCustomerId, setAssigningCustomerId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    nationalId: '',
    status: 'Mới'
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchCustomers = () => {
    setLoadingData(true);
    api.getCustomers()
      .then(data => {
        console.log('Fetched customers:', data);
        setCustomers(data);
      })
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoadingData(false));
  };

  useEffect(() => {
    fetchCustomers();
    if (user?.role === 'manager') {
      fetch('/api/users?role=sales')
        .then(res => res.json())
        .then(data => setSalesUsers(data));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const fullName = formData.fullName.trim();
    const nationalId = formData.nationalId.trim();
    
    if (!fullName || !nationalId) {
      setNotification({ message: 'Vui lòng nhập đầy đủ Họ tên và CCCD', type: 'error' });
      return;
    }

    if (fullName.length < 3) {
      setNotification({ message: 'Họ và tên phải có ít nhất 3 ký tự', type: 'error' });
      return;
    }

    const nameRegex = /^[\p{L}\s]+$/u;
    if (!nameRegex.test(fullName)) {
      setNotification({ message: 'Họ và tên không được chứa ký tự đặc biệt', type: 'error' });
      return;
    }

    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(nationalId)) {
      setNotification({ message: 'Số CCCD phải bao gồm đúng 12 chữ số', type: 'error' });
      return;
    }

    const canAdd = user?.role === 'sales' || user?.role === 'manager' || user?.role === 'admin';
    if (!canAdd) {
      setNotification({ message: 'Bạn không có quyền thêm khách hàng mới', type: 'error' });
      return;
    }

    setLoading(true);
    
    try {
      // 1. Check duplicate
      const check = await api.checkDuplicate('', nationalId, fullName);
      if (check.exists && check.customer) {
        setDuplicateCustomer(check.customer);
        setLoading(false);
        return;
      }

      // 2. Create customer
      const res = await api.createCustomer({
        ...formData,
        fullName: formData.fullName.trim(),
        nationalId: formData.nationalId.trim(),
        owner_id: user?.id,
        createdBy: user?.id
      });

      if (res.success) {
        setNotification({ message: 'Thêm khách hàng thành công!', type: 'success' });
        setIsModalOpen(false);
        setFormData({ fullName: '', phoneNumber: '', email: '', address: '', nationalId: '', status: 'Mới' });
        setSearch(''); // Xóa tìm kiếm để thấy khách hàng mới
        fetchCustomers();
      } else {
        setNotification({ message: res.message || 'Lỗi khi thêm khách hàng', type: 'error' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setNotification({ message: 'Có lỗi xảy ra khi kết nối máy chủ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInformation = async () => {
    if (!duplicateCustomer) return;
    setLoading(true);
    const res = await api.updateCustomer(duplicateCustomer.id, {
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      address: formData.address,
      nationalId: formData.nationalId,
      status: formData.status
    });
    if (res.success) {
      setNotification({ message: 'Cập nhật thông tin khách hàng thành công!', type: 'success' });
      setIsModalOpen(false);
      setDuplicateCustomer(null);
      fetchCustomers();
    } else {
      setNotification({ message: 'Lỗi khi cập nhật thông tin', type: 'error' });
    }
    setLoading(false);
  };

  const handleAssign = async (customerId: number, ownerId: number) => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: ownerId })
      });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
        setAssigningCustomerId(null);
      }
    } catch (error) {
      console.error('Error assigning customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOwnership = async () => {
    if (!duplicateCustomer || !user) return;
    setLoading(true);
    const res = await api.createRequest({
      customer_id: duplicateCustomer.id,
      request_by: user.id,
      new_data: formData,
      type: 'Ownership'
    });
    if (res.success) {
      setNotification({ message: 'Yêu cầu phân quyền đã được gửi! Thông tin mới sẽ được cập nhật sau khi quản lý duyệt.', type: 'success' });
      setIsModalOpen(false);
      setDuplicateCustomer(null);
    } else {
      setNotification({ message: res.message || 'Lỗi khi gửi yêu cầu', type: 'error' });
    }
    setLoading(false);
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!user) return;
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!user || !deleteConfirmId) return;
    
    const isManager = user.role === 'manager' || user.role === 'admin';
    
    setLoading(true);
    try {
      if (isManager) {
        const res = await api.deleteCustomer(deleteConfirmId, user.id, user.role);
        if (res.success) {
          setNotification({ message: 'Xóa khách hàng thành công!', type: 'success' });
          fetchCustomers();
        } else {
          setNotification({ message: res.message || 'Lỗi khi xóa khách hàng', type: 'error' });
        }
      } else {
        const res = await api.createRequest({
          customer_id: deleteConfirmId,
          request_by: user.id,
          type: 'Deletion'
        });
        if (res.success) {
          setNotification({ message: 'Yêu cầu xóa đã được gửi cho quản lý!', type: 'success' });
        } else {
          setNotification({ message: res.message || 'Lỗi khi gửi yêu cầu xóa', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      setNotification({ message: 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const filtered = customers.filter(c => {
    const matchesSearch = 
      (c.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.phoneNumber || '').includes(search);
    
    const matchesStatus = 
      statusFilter === 'Tất cả trạng thái' || 
      c.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Quản lý khách hàng</h2>
        {(user?.role === 'sales' || user?.role === 'manager' || user?.role === 'admin') && (
          <button 
            onClick={() => {
              setFormData({ fullName: '', phoneNumber: '', email: '', address: '', nationalId: '', status: 'Mới' });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center font-medium hover:bg-blue-600/90 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm khách hàng
          </button>
        )}
      </div>

      {notification && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Xác nhận xóa?</h3>
            <p className="text-slate-600 mb-8">
              {user?.role === 'manager' || user?.role === 'admin'
                ? "Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác."
                : "Bạn có muốn gửi yêu cầu xóa khách hàng này cho quản lý phê duyệt?"}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, SĐT..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            <option value="Mới">Mới</option>
            <option value="Tiềm năng">Tiềm năng</option>
            <option value="Đã liên hệ">Đã liên hệ</option>
            <option value="Đã mua">Đã mua</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã KH</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SĐT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CCCD</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người phụ trách</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 text-sm font-medium">Đang tải danh sách...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">Không tìm thấy khách hàng nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">KH{String(c.id).padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-semibold">{c.fullName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.phoneNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.nationalId || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {assigningCustomerId === c.id ? (
                        <select 
                          className="text-xs border border-slate-200 rounded px-1 py-0.5"
                          onChange={(e) => handleAssign(c.id, Number(e.target.value))}
                          onBlur={() => setAssigningCustomerId(null)}
                          autoFocus
                        >
                          <option value="">Chọn Sales...</option>
                          {salesUsers.map(s => (
                            <option key={s.id} value={s.id}>{s.username}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {c.owner_name || <span className="text-slate-400 italic">Chưa phân công</span>}
                          {user?.role === 'manager' && (
                            <button 
                              onClick={() => setAssigningCustomerId(c.id)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Phân công"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        c.status === 'Tiềm năng' ? "bg-blue-50 text-blue-600" : 
                        c.status === 'Mới' ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-sm">Chi tiết</button>
                        <button 
                          onClick={() => handleDeleteCustomer(c.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                <h3 className="text-xl font-bold text-slate-900">Thêm khách hàng mới</h3>
                <button onClick={() => { setIsModalOpen(false); setDuplicateCustomer(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {duplicateCustomer ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900">Khách hàng đã tồn tại!</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Khách hàng <strong>{duplicateCustomer.fullName}</strong> với CCCD <strong>{duplicateCustomer.nationalId}</strong> đã tồn tại trong hệ thống.
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          Người phụ trách hiện tại: <strong>{duplicateCustomer.owner_name || 'Chưa có'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {(!duplicateCustomer.createdBy || duplicateCustomer.createdBy === 0 || duplicateCustomer.createdBy === user?.id) ? (
                        <button 
                          onClick={handleUpdateInformation}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Cập nhật thông tin
                        </button>
                      ) : (
                        <button 
                          onClick={handleRequestOwnership}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Yêu cầu phân quyền
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setDuplicateCustomer(null)}
                      className="w-full py-2 text-slate-500 text-sm hover:underline"
                    >
                      Quay lại
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Tên khách hàng</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                        <input 
                          type="tel" 
                          required
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                          value={formData.phoneNumber}
                          onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">CCCD</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                          value={formData.nationalId}
                          onChange={e => setFormData({...formData, nationalId: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Email</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Địa chỉ</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Trạng thái</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="Mới">Mới</option>
                        <option value="Tiềm năng">Tiềm năng</option>
                        <option value="Đã liên hệ">Đã liên hệ</option>
                        <option value="Đã mua">Đã mua</option>
                      </select>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Đang kiểm tra...' : 'Kiểm tra & Lưu'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
