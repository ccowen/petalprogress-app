import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Which pages ship. "texts" serves only the prompted journal texts sign-up
 * (src/routes.texts.tsx); "full" serves everything (src/routes.tsx).
 *
 * Defaults: `vite build` → texts (what's launched), `vite` dev → full.
 * Override with VITE_APP_SURFACE=texts|full, e.g. in Vercel's env settings.
 * When more of the app launches, move its routes into routes.texts.tsx, or
 * switch production to "full".
 */
function appSurface(command: string, mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const surface = process.env.VITE_APP_SURFACE ?? env.VITE_APP_SURFACE
  if (surface === 'texts' || surface === 'full') return surface
  return command === 'build' ? 'texts' : 'full'
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const surface = appSurface(command, mode)
  const routes = surface === 'texts' ? './src/routes.texts.tsx' : './src/routes.tsx'
  return {
    plugins: [react()],
    resolve: {
      alias: { '@app/routes': fileURLToPath(new URL(routes, import.meta.url)) },
    },
    define: { 'import.meta.env.VITE_APP_SURFACE': JSON.stringify(surface) },
  }
})
