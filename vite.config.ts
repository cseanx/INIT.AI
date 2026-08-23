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
        // computed name, so Vite's static asset analysis can't emit it.
        // The worker also imports its sibling maplibre-gl-shared.mjs —
        // both must sit next to the bundle chunk or the worker fails to
        // boot (style processing stalls silently, no layers ever load).
        {
            name: 'maplibre-worker',
            writeBundle() {
                const dist = resolve('dist/assets');
                for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
                    copyFileSync(
                        resolve(`node_modules/maplibre-gl/dist/${file}`),
                        resolve(dist, file),
                    );
                }
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
