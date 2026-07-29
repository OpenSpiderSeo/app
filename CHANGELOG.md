# Changelog

All notable changes to **OpenSpider** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] — 2026-07-29

### Fixed

- Labs «Broken outbound links» — UI client ignored options and always showed 0 checked/broken (mapped phantom `issues` field). Now forwards `externalOnly` / `includeInternalUncrawled` and maps Go `broken`/`checked`/`skipped`/`issuesAdded`.

## [1.0.1] — 2026-07-29

### Fixed

- Windows: running the host `.exe` from inside a ZIP (without `resources.neu` beside it) showed the blank **Neutralinojs** window — ship a **self-extracting** `OpenSpider-windows-x64.exe` that always unpacks the full app folder first.
- Release: Windows asset is a direct `.exe` download (Linux/macOS stay ZIP).

### Notes

- **Windows:** download [`OpenSpider-windows-x64.exe`](https://github.com/OpenSpiderSeo/app/releases/download/v1.0.1/OpenSpider-windows-x64.exe) → double-click (SmartScreen may ask once). Do not use a lone host binary from a ZIP preview.

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
- Release assets are **four separate ZIPs** (linux / macos-x64 / macos-arm64 / windows) — never one fat archive with all Neutralino host binaries.

### Notes

- **WSL**: native window needs WSLg; otherwise run on Windows for GUI QA.
- Stubs remain for session/schedule/ranks/metrika/indexnow/auto-update where not yet implemented.

[1.0.2]: https://github.com/OpenSpiderSeo/app/releases/tag/v1.0.2
[1.0.1]: https://github.com/OpenSpiderSeo/app/releases/tag/v1.0.1
[1.0.0]: https://github.com/OpenSpiderSeo/app/releases/tag/v1.0.0
