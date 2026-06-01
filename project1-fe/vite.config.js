import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: 'all', // cho phép mọi host — cần thiết khi dùng ngrok/tunnel
  },
});
