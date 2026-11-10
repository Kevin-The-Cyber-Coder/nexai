import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.NEXAI_API_PROXY || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': apiTarget } }
});
