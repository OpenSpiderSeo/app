# Changelog

All notable changes to **OpenSpider** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-29

First clean public release of the **Neutralino.js + Vite/React/TS + Go extension** stack (Electron removed).

### Added

- Native desktop shell via Neutralino + Go engine as extension (`extGo` / WebSocket IPC); HTTP sidecar kept for browser/CI smoke on `:7845`.
- Crawl engine in Go: pause/resume, robots.txt, outbound checks, CSV export, projects + history on disk.
- Analysis hub: site metrics, full audit (crawl + local metrics + SERP + PageSpeed), Googlebot view.
- Labs tools: sitemap URL extractor, outbound broken links, mentions, custom tools.
- RU/EN UI with persistent locale (localStorage + Neutralino.storage).
- Tabbed desks: Dashboard (Overview / Charts / SEO / Speed / Rankings / Recommendations), Crawl, Metrics, Labs.
- Cross-platform CI release matrix (Linux x64, macOS x64/arm64, Windows x64) on tag `v1.0.0`.

### Fixed

- Sitemap extractor — XML `loc` parsing (urlset no longer returns 0 URLs).
- Crawl seed URL — no silent re-root via auto-follow 307 into `/en`; start URL stays user-entered.
- PageSpeed HTTP 429 — fallback to local-lab scores; full-audit uses the same path as dedicated PSI.
- Language switch persists across Neutralino restarts.
- Packaged builds ship with `enableInspector: false` (DevTools only in `pnpm neu:dev`).

### Notes

- **WSL**: native window needs WSLg; otherwise run on Windows for GUI QA.
- Stubs remain for session/schedule/ranks/metrika/indexnow/auto-update where not yet implemented.

[1.0.0]: https://github.com/OpenSpiderSeo/app/releases/tag/v1.0.0
