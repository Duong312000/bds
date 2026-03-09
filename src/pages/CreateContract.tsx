import React, { useState, useEffect } from 'react';
import { CheckCircle2, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { formatCurrency, cn } from '../lib/utils';
import { Customer, Property } from '../types';

export const CreateContract = () => {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [paymentInfo, setPaymentInfo] = useState({
    deposit: 0,
    installments: 12,
    contractDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getCustomers().then(setCustomers);
    api.getProperties().then(setProperties);
  }, []);

  const property = properties.find(p => p.id === selectedProperty);

  const handleCreate = async () => {
    if (!selectedCustomer || !selectedProperty || !property) return;
    setLoading(true);
    try {
      await api.createContract({
        customer_id: selectedCustomer,
        property_id: selectedProperty,
        total_value: property.price,
        deposit: paymentInfo.deposit,
        installments: paymentInfo.installments
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Tạo hợp đồng thành công!</h2>
        <p className="text-slate-500 max-w-md">Hợp đồng đã được lưu vào hệ thống và đang chờ cấp quản lý phê duyệt.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl"
        >
          Về Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Tạo hợp đồng tự động</h2>
        <p className="text-slate-500">Hoàn thành 4 bước để sinh hợp đồng pháp lý.</p>
      </div>

      <div className="flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300",
              step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white border-2 border-slate-200 text-slate-400"
            )}>
              {s}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase mt-2 tracking-wider",
              step >= s ? "text-blue-600" : "text-slate-400"
            )}>
              {s === 1 ? 'Khách hàng' : s === 2 ? 'Bất động sản' : s === 3 ? 'Thanh toán' : 'Hoàn tất'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Bước 1: Chọn khách hàng</h3>
              <div className="grid grid-cols-1 gap-4">
                {customers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c.id)}
                    className={cn(
                      "flex items-center p-4 rounded-xl border-2 text-left transition-all",
                      selectedCustomer === c.id ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mr-4">
                      <UserIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{c.fullName}</p>
                      <p className="text-sm text-slate-500">{c.phoneNumber} • {c.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Bước 2: Chọn bất động sản</h3>
              <div className="grid grid-cols-1 gap-4">
                {properties.filter(p => p.status === 'Còn trống').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProperty(p.id)}
                    className={cn(
                      "flex items-center p-4 rounded-xl border-2 text-left transition-all",
                      selectedProperty === p.id ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <img src={p.image_url} className="w-20 h-20 rounded-lg object-cover mr-4" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{p.title}</p>
                      <p className="text-sm text-slate-500">{p.location}</p>
                      <p className="text-blue-600 font-bold mt-1">{formatCurrency(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Bước 3: Thông tin thanh toán</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Giá bán niêm yết</label>
                  <div className="p-4 bg-slate-50 rounded-xl font-bold text-slate-900">{formatCurrency(property?.price || 0)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Số tiền đặt cọc (VND)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600"
                    value={paymentInfo.deposit}
                    onChange={(e) => setPaymentInfo({...paymentInfo, deposit: Number(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Số đợt thanh toán</label>
                    <select 
                      className="w-full p-4 rounded-xl border border-slate-200 outline-none"
                      value={paymentInfo.installments}
                      onChange={(e) => setPaymentInfo({...paymentInfo, installments: Number(e.target.value)})}
                    >
                      <option value={1}>1 đợt (Thanh toán ngay)</option>
                      <option value={6}>6 đợt</option>
                      <option value={12}>12 đợt</option>
                      <option value={24}>24 đợt</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Ngày ký hợp đồng</label>
                    <input 
                      type="date" 
                      className="w-full p-4 rounded-xl border border-slate-200 outline-none"
                      value={paymentInfo.contractDate}
                      onChange={(e) => setPaymentInfo({...paymentInfo, contractDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Bước 4: Xác nhận thông tin</h3>
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-bold text-slate-900">{customers.find(c => c.id === selectedCustomer)?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bất động sản:</span>
                  <span className="font-bold text-slate-900">{property?.title}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng giá trị:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(property?.price || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đặt cọc:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(paymentInfo.deposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số đợt thanh toán:</span>
                  <span className="font-bold text-slate-900">{paymentInfo.installments} đợt</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-10">
          <button
            disabled={step === 1}
            onClick={() => setStep(s => s - 1)}
            className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Quay lại
          </button>
          {step < 4 ? (
            <button
              disabled={(step === 1 && !selectedCustomer) || (step === 2 && !selectedProperty)}
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              Tiếp tục
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 flex items-center"
            >
              {loading ? 'Đang xử lý...' : 'Tạo hợp đồng tự động'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
