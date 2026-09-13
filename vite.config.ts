import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas para que dist/index.html se pueda abrir con doble clic,
  // sin servidor. El enrutado por hash ya funciona sobre file://.
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
