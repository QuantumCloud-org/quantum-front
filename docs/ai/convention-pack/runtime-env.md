# quantum-front Runtime Env

This file is the runtime-env declaration consumed by `scaffold-page-gen`.
Do not infer these values from `package.json`; update this file when the local demo contract changes.

| key | value |
|---|---|
| dev_command | `bun run dev -- --host 127.0.0.1 --port 5173` |
| port | `5173` |
| health_url | `http://127.0.0.1:5173/` |
| teardown | Stop the foreground Vite process with Ctrl-C, or kill the process bound to port 5173. |

## Notes

- Enable page mock demo explicitly with `VITE_FEATURE_MOCK=true bun run dev -- --host 127.0.0.1 --port 5173`.
- Do not commit `VITE_FEATURE_MOCK=true` into `.env.dev` or `.env.produce`.
