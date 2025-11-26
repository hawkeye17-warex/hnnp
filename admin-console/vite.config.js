import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
var ANALYZE = process.env.ANALYZE === 'true';
export default defineConfig({
    plugins: [
        react(),
        ANALYZE
            ? visualizer({
                filename: 'dist/bundle-analysis.html',
                template: 'treemap',
                gzipSize: true,
                brotliSize: true,
                open: false,
            })
            : undefined,
    ].filter(Boolean),
    server: {
        port: 5173,
    },
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                },
            },
            treeshake: {
                moduleSideEffects: false,
            },
        },
    },
});
