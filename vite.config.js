import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { app } from './server/index.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'veyra-api-server',
      configureServer(server) {
        server.middlewares.use(app);
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
});
