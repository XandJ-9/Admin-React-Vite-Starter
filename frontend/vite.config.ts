import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  const rawBase = env.VITE_BASE_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // 所有 node_modules 合并为单个 vendor chunk：避免子串分包将强耦合的 React 生态
            // (react / react-dom / antd / @tanstack / zustand / lucide-react / rc-* 等) 切成多个
            // chunk 而产生跨 chunk 循环依赖，曾导致运行时白屏。新增独立大型库时再按需拆分。
            return 'vendor';
          },
        },
      },
    },
  };
});
