import { defineConfig } from 'vite';

export default defineConfig({
  base: '/EasyOriginals/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
});
