import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'dev'; }
})();

export default defineConfig({
  base: '/katha/',
  define: {
    __BUILD_LABEL__: JSON.stringify(`${new Date().toISOString().slice(0, 10)}-${gitSha}`)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
