import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

function loadCustomEnv(mode: string) {
  const envFileMap: Record<string, string> = {
    development: '.env.dev',
    production: '.env.produce',
  }
  const envFile = envFileMap[mode]
  if (!envFile) return {}

  const envFilePath = resolve(process.cwd(), envFile)
  if (!existsSync(envFilePath)) return {}

  return readFileSync(envFilePath, 'utf8')
    .split(/\r?\n/)
    .reduce(
      (acc, line) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return acc

        const separatorIndex = trimmed.indexOf('=')
        if (separatorIndex === -1) return acc

        const key = trimmed.slice(0, separatorIndex).trim()
        const value = trimmed.slice(separatorIndex + 1).trim()

        if (key.startsWith('VITE_')) {
          acc[key] = value.replace(/^['"]|['"]$/g, '')
        }

        return acc
      },
      {} as Record<string, string>
    )
}

export default defineConfig(({ mode }) => {
  const customEnv = loadCustomEnv(mode)
  const define = Object.fromEntries(
    Object.entries(customEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ])
  )
  const apiProxyTarget = customEnv.VITE_API_PROXY_TARGET?.trim()

  return {
    define,
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: apiProxyTarget
      ? {
          proxy: {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, '/talent_manger'),
            },
          },
        }
      : undefined,
  }
})
