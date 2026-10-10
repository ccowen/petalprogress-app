import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Which pages ship. "texts" serves only the guided-journal texts pages
 * (src/routes.texts.tsx); "full" adds the mandala, gallery, calendar and admin
 * pages (src/routes.tsx), which aren't launched and are hidden for now.
 *
 * Default: texts, for both `vite build` and `vite` dev, so local dev behaves
 * like production. Set VITE_APP_SURFACE=full (in .env.local or inline) to work
 * on the hidden pages. When more of the app launches, move its routes into
 * routes.texts.tsx, or switch the default to "full".
 */
function appSurface(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const surface = process.env.VITE_APP_SURFACE ?? env.VITE_APP_SURFACE
  return surface === 'full' ? 'full' : 'texts'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const surface = appSurface(mode)
  const routes = surface === 'texts' ? './src/routes.texts.tsx' : './src/routes.tsx'
  return {
    plugins: [react()],
    resolve: {
      alias: { '@app/routes': fileURLToPath(new URL(routes, import.meta.url)) },
    },
    define: { 'import.meta.env.VITE_APP_SURFACE': JSON.stringify(surface) },
  }
})
