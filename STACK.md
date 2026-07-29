# OpenSpider — stack (v1.0.0)

## HOW-TO-RUN (native desktop)

**Prerequisites:** Node.js **22+** (`nvm use` — `.nvmrc` = 22), Go 1.22+, pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`).

### Windows / Linux / macOS

```bash
git clone git@github.com:OpenSpiderSeo/app.git
cd app
nvm use          # or: fnm / volta — Node 22 required
pnpm install     # re-run after Node upgrade if @tailwindcss/oxide native binding fails
pnpm neu:dev
```

Opens Neutralino window. **Go engine runs as a Neutralino extension** ([neutralino-ext-go](https://github.com/hschneider/neutralino-ext-go)) — spawned by Neutralino, WebSocket IPC, not a separate HTTP sidecar on `:7845`.

Close window or Ctrl+C to stop. **DevTools (F12)** only while `pnpm neu:dev` runs (`enableInspector` toggled on for the session). **Packaged releases ship with inspector off.**

### WSL (GUI caveat)

Native window **fails without WSLg**. Run `pnpm neu:dev` on **Windows** for GUI QA.

### Headless API smoke (browser dev / CI)

HTTP sidecar still built as `go/bin/openspider` for curl tests and `pnpm dev` (Vite + HTTP):

```bash
pnpm build:go
./go/bin/openspider -addr :7845 &
curl -s http://127.0.0.1:7845/api/health
```

### Build release locally

```bash
pnpm build        # Go extension + UI → neutralino/
pnpm release      # bundle → neutralino/dist/ (inspector forced off)
```

---

**v1.0.0** — Neutralino.js + Vite/React/TS + **Go Neutralino extension**. Electron removed.

## Architecture

```
Neutralino.js (desktop shell)
    ├── extensions/go/openspider   ← Go engine (WebSocket ext protocol)
    │       └── internal/api       REST handlers (in-process Dispatch, no TCP in desktop)
    └── Vite + React UI (web/)
            ↕  Neutralino.extensions.dispatch('extGo', 'runGo', {function:'rpc',…})
            ↕  Neutralino.events ('rpcResult', 'crawlEvent')
```

**Pattern:** [neutralino-ext-go](https://github.com/hschneider/neutralino-ext-go) — `GO.run(fn, data)` → Go `runGo` event → `ext.Send(event, data)` back to UI.

**Fallback:** Browser dev (`pnpm dev`) and headless smoke use HTTP + SSE on `127.0.0.1:7845` via standalone `go/cmd/openspider`.

**Rule:** crawl, HTML parse, issue detection run in **Go only**. UI is a thin client.

## Key files

| Path | Role |
|------|------|
| `neutralino/neutralino.config.json` | `enableExtensions`, `extensions[].id: extGo`; **`enableInspector: false` in release** |
| `neutralino/extensions/go/openspider` | Built from `go/cmd/openspider-ext` |
| `neutralino/resources/js/go-extension.js` | `GoExtension` class, `GO.run()` |
| `web/src/api/transport.ts` | RPC vs HTTP routing |
| `go/internal/neutralinoext/` | WebSocket client (from neutralino-ext-go) |

## Install & run

```bash
pnpm install
pnpm neu:dev      # build extension + UI, open Neutralino window
```

Same as `pnpm start` / `pnpm dev:desktop`.

## Browser fallback (debugging only)

```bash
pnpm dev:go & pnpm dev:ui
# open http://localhost:5173 — HTTP sidecar, not product IPC path
```

## Build & release

```bash
pnpm build:go     # go/bin/openspider + go/bin/openspider-ext
pnpm build:ui     # web/dist/
pnpm build        # stage extension + UI into neutralino/
pnpm release      # Neutralino bundle → neutralino/dist/
```

CI on tag `v1.0.0` / `v1.0.*` runs `.github/workflows/release-v1.yml` (syncs version from tag, inspector off).

## Not yet ported to Go (stubs)

Auto-update, scheduled crawls, session/ranks/metrika/indexnow — UI returns structured "not implemented". Googlebot view, PSI/SERP/Labs full audit **are** in Go.
