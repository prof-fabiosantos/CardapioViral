import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Define process.env variables so they are replaced at build time
      // This fixes the "process is not defined" error and allows using process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || env.API_KEY),
      'process.env.VITE_STRIPE_PUBLIC_KEY': JSON.stringify(env.VITE_STRIPE_PUBLIC_KEY),
      'process.env.VITE_STRIPE_PRICE_SOLO': JSON.stringify(env.VITE_STRIPE_PRICE_SOLO),
      'process.env.VITE_STRIPE_PRICE_PRO': JSON.stringify(env.VITE_STRIPE_PRICE_PRO),
      'process.env.VITE_STRIPE_PRICE_AGENCY': JSON.stringify(env.VITE_STRIPE_PRICE_AGENCY),
    },
    build: {
      outDir: 'dist',
    },
  };
});