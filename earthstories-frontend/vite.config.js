import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import narrate from './api/narrate.js'

/**
 * Serves the serverless narration handler during `vite dev`, so local
 * development uses the same server-side-key path as production instead of
 * needing the key in the browser.
 */
function narrationDevApi(env) {
  return {
    name: 'earthstories-narration-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/narrate', async (req, res) => {
        process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || env.GROQ_API_KEY

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')

        try {
          req.body = raw ? JSON.parse(raw) : {}
        } catch {
          req.body = {}
        }

        // Minimal Express-shaped response shim for the handler.
        res.status = code => { res.statusCode = code; return res }
        res.json = payload => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
          return res
        }

        await narrate(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' prefix loads every var, including the server-only GROQ_API_KEY.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), narrationDevApi(env)],
    build: {
      // Recharts and Leaflet are only needed once the story opens; splitting
      // them keeps the onboarding screen light.
      chunkSizeWarningLimit: 700,
    },
  }
})
