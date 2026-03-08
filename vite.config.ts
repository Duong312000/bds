import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(), 
      tailwindcss()
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // 1. Sửa lỗi Blocked Host trên Railway
      allowedHosts: [
        'bds-production-69c8.up.railway.app',
        '.railway.app'
      ],
      // 2. Cấu hình HMR
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
