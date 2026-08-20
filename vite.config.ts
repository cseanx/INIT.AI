import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // MapLibre resolves its worker at runtime via
        // new URL(`./maplibre-gl-worker${dev}.mjs`, import.meta.url) with a
        // computed name, so Vite's static asset analysis can't emit the file.
        // Copy the real worker next to the chunk so the browser gets actual
        // worker code instead of the SPA fallback (index.html).
        {
            name: 'maplibre-worker',
            writeBundle() {
                const worker = resolve(
                    'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',
                );
                copyFileSync(worker, resolve('dist/assets/maplibre-gl-worker.mjs'));
            },
        },
    ],
    // When the Python/FastAPI backend is live, re-enable the proxy so
    // /api/* requests reach it during development:
    // server: {
    //     proxy: {
    //         '/api': { target: 'http://localhost:8000', changeOrigin: true },
    //     },
    // },
});
