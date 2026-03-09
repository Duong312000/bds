import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BarChart3, 
  X, 
  Building2, 
  MapPin, 
  Maximize2, 
  DollarSign, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  User as UserIcon,
  Search,
  FileText,
  Link as LinkIcon,
  Upload
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, cn } from '../lib/utils';
import { Property, User, Customer } from '../types';

interface PropertiesProps {
  user: User | null;
}

export const Properties = ({ user }: PropertiesProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Chung cư',
    price: '',
    area: '',
    location: '',
    image_url: '',
    description: '',
    listing_type: 'Bán'
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchProperties = () => {
    api.getProperties().then(setProperties);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setNotification({ message: 'File quá lớn! Vui lòng chọn ảnh dưới 15MB.', type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image_url: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchCustomers = () => {
    api.getCustomers().then(setCustomers);
  };

  useEffect(() => {
    fetchProperties();
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const isManager = user.role === 'manager' || user.role === 'admin';
    const isSales = user.role === 'sales';
    
    setLoading(true);
    try {
      if (isEdit) {
        if (isManager) {
          // Direct update
          const res = await api.updateProperty(editingId!, {
            ...formData,
            price: Number(formData.price),
            area: Number(formData.area)
          });
          if (res.success) {
            setNotification({ message: 'Cập nhật bất động sản thành công!', type: 'success' });
            setIsModalOpen(false);
            fetchProperties();
          } else {
            setNotification({ message: 'Lỗi khi cập nhật', type: 'error' });
          }
        } else if (isSales) {
          // Create update request
          const res = await api.createRequest({
            property_id: editingId!,
            request_by: user.id,
            type: 'PropertyUpdate',
            new_data: {
              ...formData,
              price: Number(formData.price),
              area: Number(formData.area)
            }
          });
          if (res.success) {
            setNotification({ message: 'Yêu cầu cập nhật đã được gửi cho quản lý phê duyệt!', type: 'success' });
            setIsModalOpen(false);
          } else {
            setNotification({ message: res.message || 'Lỗi khi gửi yêu cầu', type: 'error' });
          }
        }
      } else {
        // Create new property
        const res = await api.createProperty({
          ...formData,
          price: Number(formData.price),
          area: Number(formData.area)
        });
        if (res.success) {
          setNotification({ message: 'Thêm bất động sản thành công!', type: 'success' });
          setIsModalOpen(false);
          setFormData({ title: '', type: 'Chung cư', price: '', area: '', location: '', image_url: '', description: '', listing_type: 'Bán' });
          fetchProperties();
        } else {
          setNotification({ message: 'Lỗi khi thêm bất động sản', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error processing property:', error);
      setNotification({ message: 'Có lỗi xảy ra khi kết nối máy chủ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    const isManager = user.role === 'manager' || user.role === 'admin';
    
    setLoading(true);
    try {
      if (isManager) {
        const res = await api.deleteProperty(id);
        if (res.success) {
          setNotification({ message: 'Xóa bất động sản thành công!', type: 'success' });
          fetchProperties();
        } else {
          setNotification({ message: 'Lỗi khi xóa', type: 'error' });
        }
      } else {
        // Sales request deletion
        const res = await api.createRequest({
          property_id: id,
          request_by: user.id,
          type: 'Deletion'
        });
        if (res.success) {
          setNotification({ message: 'Yêu cầu xóa đã được gửi cho quản lý phê duyệt!', type: 'success' });
        } else {
          setNotification({ message: res.message || 'Lỗi khi gửi yêu cầu', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      setNotification({ message: 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleReserve = async (customerId: number) => {
    if (!selectedProperty || !user) return;
    
    setLoading(true);
    try {
      const res = await api.createReservation({
        customer_id: customerId,
        property_id: selectedProperty.id,
        sales_id: user.id
      });
      if (res.success) {
        setNotification({ message: 'Giữ chỗ thành công!', type: 'success' });
        setIsReservationModalOpen(false);
        fetchProperties();
      } else {
        setNotification({ message: res.message || 'Lỗi khi giữ chỗ', type: 'error' });
      }
    } catch (error) {
      setNotification({ message: 'Lỗi kết nối', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.fullName.toLowerCase().includes(searchCustomer.toLowerCase()) || 
    c.phoneNumber.includes(searchCustomer)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý bất động sản</h2>
          <p className="text-slate-500 text-sm">Danh sách các dự án đang bán và cho thuê</p>
        </div>
        {(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'sales') && (
          <button 
            onClick={() => {
              setIsEdit(false);
              setEditingId(null);
              setFormData({ title: '', type: 'Chung cư', price: '', area: '', location: '', image_url: '', description: '', listing_type: 'Bán' });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-brand-blue text-white rounded-xl flex items-center font-medium hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm dự án
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <ImageIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Xác nhận xóa?</h3>
            <p className="text-slate-600 mb-8">
              {user?.role === 'manager' || user?.role === 'admin'
                ? "Bạn có chắc chắn muốn xóa bất động sản này? Hành động này không thể hoàn tác."
                : "Bạn có muốn gửi yêu cầu xóa bất động sản này cho quản lý phê duyệt?"}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((p) => (
          <div 
            key={p.id} 
            onClick={() => {
              setSelectedProperty(p);
              setIsDetailModalOpen(true);
            }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={p.image_url || 'https://picsum.photos/seed/property/800/600'} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className={cn(
                "absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                p.status === 'Còn trống' ? "bg-emerald-500 text-white" : 
                p.status === 'Giữ chỗ' ? "bg-amber-500 text-white" :
                p.status === 'Đặt cọc' ? "bg-blue-500 text-white" : "bg-red-500 text-white"
              )}>
                {p.status}
              </div>
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-slate-900 uppercase">
                  {p.type}
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase",
                  p.listing_type === 'Bán' ? "bg-blue-600" : "bg-purple-600"
                )}>
                  {p.listing_type}
                </div>
              </div>
              
              {(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'sales') && (
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEdit(true);
                      setEditingId(p.id);
                      setFormData({
                        title: p.title,
                        type: p.type,
                        price: String(p.price),
                        area: String(p.area),
                        location: p.location,
                        image_url: p.image_url || '',
                        description: p.description || '',
                        listing_type: p.listing_type as any
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(p.id);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{p.title}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-slate-400" /> {p.location}
              </p>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Giá bán</p>
                  <p className="text-xl font-black text-blue-600">{formatCurrency(p.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Diện tích</p>
                  <p className="text-sm font-bold text-slate-900">{p.area} m²</p>
                </div>
              </div>
              
              {p.status === 'Còn trống' && user?.role === 'sales' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProperty(p);
                    setIsReservationModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Giữ chỗ ngay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Chi Tiết Bất Động Sản */}
      {isDetailModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-2xl relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative h-64 flex-shrink-0">
              <img src={selectedProperty.image_url || 'https://picsum.photos/seed/property/800/600'} alt={selectedProperty.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-6 flex gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold uppercase">
                  {selectedProperty.type}
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase text-white",
                  selectedProperty.listing_type === 'Bán' ? "bg-blue-700" : "bg-purple-700"
                )}>
                  {selectedProperty.listing_type}
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  selectedProperty.status === 'Còn trống' ? "bg-emerald-500 text-white" : 
                  selectedProperty.status === 'Giữ chỗ' ? "bg-amber-500 text-white" :
                  selectedProperty.status === 'Đặt cọc' ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                )}>
                  {selectedProperty.status}
                </span>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{selectedProperty.title}</h3>
                  <p className="flex items-center text-slate-500">
                    <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                    {selectedProperty.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-brand-blue">{formatCurrency(selectedProperty.price)}</p>
                  <p className="text-sm font-bold text-slate-400 mt-1">{selectedProperty.area} m² • {formatCurrency(selectedProperty.price / selectedProperty.area)}/m²</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Loại hình</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProperty.type}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diện tích</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProperty.area} m²</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trạng thái</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProperty.status}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Mô tả chi tiết
                </h4>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic">
                  {selectedProperty.description || "Chưa có mô tả chi tiết cho dự án này. Vui lòng liên hệ bộ phận kinh doanh để biết thêm thông tin."}
                </div>
              </div>

              {selectedProperty.status === 'Còn trống' && user?.role === 'sales' && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setIsReservationModalOpen(true);
                    }}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                  >
                    <Clock className="w-5 h-5" /> Giữ chỗ ngay bây giờ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Giữ Chỗ */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsReservationModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tạo phiếu giữ chỗ</h3>
                  <p className="text-xs text-slate-500">{selectedProperty?.title}</p>
                </div>
              </div>
              <button onClick={() => setIsReservationModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Tìm khách hàng theo tên hoặc SĐT..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleReserve(c.id)}
                    className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-blue-50 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{c.fullName}</p>
                        <p className="text-xs text-slate-500">{c.phoneNumber}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="text-center py-4 text-sm text-slate-500 italic">Không tìm thấy khách hàng</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Bất Động Sản */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-xl relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{isEdit ? 'Chỉnh sửa bất động sản' : 'Thêm bất động sản mới'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tên dự án/Bất động sản</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="VD: Vinhomes Central Park"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Loại hình</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Chung cư">Chung cư</option>
                    <option value="Biệt thự">Biệt thự</option>
                    <option value="Nhà phố">Nhà phố</option>
                    <option value="Đất nền">Đất nền</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Hình thức</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.listing_type}
                    onChange={(e) => setFormData({...formData, listing_type: e.target.value as any})}
                  >
                    <option value="Bán">Bán</option>
                    <option value="Thuê">Thuê</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Giá {formData.listing_type === 'Thuê' ? '(VNĐ/tháng)' : '(VNĐ)'}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="VD: 2500000000"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Diện tích (m²)</label>
                  <div className="relative">
                    <Maximize2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="VD: 75"
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Vị trí</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="VD: Quận 1, TP.HCM"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Hình ảnh dự án</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Dán link ảnh (https://...)"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="file-upload"
                        onChange={handleFileUpload}
                      />
                      <label 
                        htmlFor="file-upload"
                        className="flex items-center justify-center w-full px-4 py-2.5 bg-blue-50 text-blue-600 border-2 border-dashed border-blue-200 rounded-xl text-sm font-bold cursor-pointer hover:bg-blue-100 transition-all"
                      >
                        <Upload className="w-4 h-4 mr-2" /> Tải ảnh từ máy
                      </label>
                    </div>
                  </div>
                  {formData.image_url && (
                    <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img src={formData.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, image_url: ''})}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mô tả chi tiết</label>
                  <textarea
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px]"
                    placeholder="Nhập mô tả chi tiết về dự án, tiện ích, pháp lý..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : (isEdit ? (user?.role === 'sales' ? 'Gửi yêu cầu cập nhật' : 'Cập nhật dự án') : 'Lưu dự án')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
