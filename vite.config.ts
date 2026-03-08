import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Cho phép host cụ thể của Railway hoặc dùng 'all' để linh hoạt
    allowedHosts: [
      'bds-production-69c8.up.railway.app', // Host hiện tại của bạn
      '.railway.app' // Cho phép tất cả các sub-domain của railway
    ],
    // Nếu bạn muốn mở hoàn toàn (tiện nhưng ít bảo mật hơn một chút):
    // allowedHosts: 'all'
  },
});
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
