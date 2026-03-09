import React, { useState } from 'react';
import { Building2, User as UserIcon, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('sales');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegister && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const data = await api.register(username, password, role);
        if (data.success) {
          setIsRegister(false);
          setError('Đăng ký thành công! Vui lòng đợi quản lý duyệt tài khoản trước khi đăng nhập.');
        } else {
          setError(data.message || 'Lỗi đăng ký');
        }
      } else {
        const data = await api.login(username, password);
        if (data.success && data.user) {
          onLogin(data.user);
        } else {
          setError(data.message || 'Sai tài khoản hoặc mật khẩu');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative flex flex-col overflow-hidden">
      {/* Background Poster Grid */}
      <div className="absolute inset-0 z-0 opacity-50 scale-110">
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 transform -rotate-12 -translate-y-20 -translate-x-20">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-slate-800 rounded-sm overflow-hidden shadow-2xl">
              <img 
                src={`https://picsum.photos/seed/movie-${i}/200/300`} 
                alt="Movie Poster" 
                className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
        {/* Dark Overlays */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
      </div>

      {/* Header Logo */}
      <header className="relative z-20 p-6 md:px-12">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xl overflow-hidden p-1.5 border border-white/20">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              {/* Hình khối nhà cách điệu hiện đại */}
              <path d="M50 5L15 35V85H85V35L50 5Z" fill="url(#logoGrad)"/>
              <path d="M50 20L25 40V80H75V40L50 20Z" fill="white"/>
              <rect x="42" y="55" width="16" height="25" fill="#3b82f6" rx="2"/>
              {/* Điểm nhấn mái nhà */}
              <path d="M15 35L50 5L85 35" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tighter text-white leading-none">iHOUZZ</span>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mt-1">BĐS HOUZZ UNI</span>
          </div>
        </div>
      </header>

      {/* Login Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[450px] bg-black/75 rounded-md p-8 md:p-16 space-y-8"
        >
          <h1 className="text-3xl font-bold text-white">
            {isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "p-3 text-sm rounded bg-[#e87c03] text-white font-medium"
                  )}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 pt-6 pb-2 bg-[#333] text-white rounded focus:bg-[#454545] outline-none transition-colors peer placeholder-transparent"
                  placeholder="Tên đăng nhập"
                  id="username"
                  required
                />
                <label 
                  htmlFor="username"
                  className="absolute left-5 top-1 text-[11px] text-[#8c8c8c] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:text-[11px] peer-focus:top-1 pointer-events-none"
                >
                  Tên đăng nhập
                </label>
              </div>

              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 pt-6 pb-2 bg-[#333] text-white rounded focus:bg-[#454545] outline-none transition-colors peer placeholder-transparent"
                  placeholder="Mật khẩu"
                  id="password"
                  required
                />
                <label 
                  htmlFor="password"
                  className="absolute left-5 top-1 text-[11px] text-[#8c8c8c] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:text-[11px] peer-focus:top-1 pointer-events-none"
                >
                  Mật khẩu
                </label>
              </div>

              {isRegister && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 pt-6 pb-2 bg-[#333] text-white rounded focus:bg-[#454545] outline-none transition-colors peer placeholder-transparent"
                    placeholder="Xác nhận mật khẩu"
                    id="confirmPassword"
                    required
                  />
                  <label 
                    htmlFor="confirmPassword"
                    className="absolute left-5 top-1 text-[11px] text-[#8c8c8c] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:text-[11px] peer-focus:top-1 pointer-events-none"
                  >
                    Xác nhận mật khẩu
                  </label>
                </motion.div>
              )}

              {isRegister && (
                <div className="space-y-2">
                  <label className="text-[#8c8c8c] text-sm ml-1">Chọn vai trò của bạn</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-5 py-4 bg-[#333] text-white rounded focus:bg-[#454545] outline-none transition-colors"
                  >
                    <option value="sales">Nhân viên Sales</option>
                    <option value="accountant">Kế toán</option>
                  </select>
                </div>
              )}
            </div>

            <button
  type="submit"
  disabled={loading}
  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors active:scale-[0.99] disabled:opacity-50 mt-4 shadow-lg shadow-blue-900/20"
>
  {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
</button>

            <div className="flex items-center justify-between text-[#b3b3b3] text-sm pt-2">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 mr-2 accent-[#b3b3b3]" />
                Ghi nhớ tôi
              </label>
              <a href="#" className="hover:underline">Bạn cần trợ giúp?</a>
            </div>
          </form>

          <div className="space-y-4 pt-8">
            <div className="text-[#737373] text-base">
              {isRegister ? 'Đã có tài khoản?' : 'Mới sử dụng BDS Pro?'}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setUsername('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-white hover:underline ml-1 font-medium"
              >
                {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
              </button>
            </div>
            
            <p className="text-[#8c8c8c] text-[13px] leading-tight">
              Trang này được bảo vệ bởi Google reCAPTCHA để đảm bảo bạn không phải là robot. <a href="#" className="text-[#0071eb] hover:underline">Tìm hiểu thêm.</a>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-black/75 border-t border-[#333] p-8 md:px-12 mt-auto">
        <div className="max-w-[1000px] mx-auto text-[#737373] text-sm space-y-6">
          <p>Bạn có câu hỏi? Liên hệ với chúng tôi.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="#" className="hover:underline">Câu hỏi thường gặp</a>
            <a href="#" className="hover:underline">Trung tâm trợ giúp</a>
            <a href="#" className="hover:underline">Điều khoản sử dụng</a>
            <a href="#" className="hover:underline">Quyền riêng tư</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
