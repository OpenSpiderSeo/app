# OpenSpider × SEO Utils — gap-анализ

**Дата:** 2026-07-28  
**Конкурент:** [SEO Utils](https://seoutils.app/) (десктоп, one-time license $64–165, macOS/Windows/Linux)  
**Источники:** публичный сайт, [help.seoutils.app](https://help.seoutils.app/), [llms.txt](https://help.seoutils.app/llms.txt) — без доступа к их коду и закрытым API.  
**OpenSpider:** v0.10.1, Electron, MIT, local-first spider + audit hub. Windows: Squirrel auto-update с GitHub Releases; Authenticode signing через CI secrets (OV/EV cert — иначе SmartScreen «неизвестный издатель»).

---

## 1. Вердикт

| Вопрос | Ответ |
|--------|--------|
| Копировать SEO Utils целиком? | **Нет.** Это платный продукт с licensing, hosted white-label, DataForSEO-арендой и десятками keyword/rank-модулей. Копировать код/ассеты/UX один-в-один нельзя и не нужно. |
| Где OpenSpider уже сильнее? | **Technical spider:** безлимитный краул, issue-детекторы (canonical, hreflang, JSON-LD, soft-404, near-dup), Googlebot-view, граф ссылок, Labs full audit, shadow risk, PDF-отчёт, MIT. |
| Где SEO Utils сильнее? | **Keyword/rank hub:** scheduled organic rank tracker, clustering (semantic + SERP), LLM visibility, local grid/GMB, live GSC suite, bulk metadata AI, white-label hosted reports, MCP, automations. |
| Стратегия для OpenSpider | Углублять **local crawl + audit**; добавлять **rank/keyword** и **GSC live** слоями; опциональный **BYO DataForSEO** — не обязательный путь. |

---

## 2. Каталог SEO Utils (публичная документация)

Сводка инструментов из официальной таблицы features ([readme](https://help.seoutils.app/readme.md)) и маркетинга.

| # | Инструмент SEO Utils | DataForSEO? | Кратко |
|---|----------------------|-------------|--------|
| 1 | Backlinks Analytics | Да | Профиль ссылок, качество, источники |
| 2 | Traffic Analytics | Да | Трафик конкурентов, organic keywords |
| 3 | Semantic Keyword Clustering | Нет | Локальные embedding-модели, без лимита токенов |
| 4 | SERP Clustering | Опционально | Кластеризация по пересечению SERP (50K–200K kw) |
| 5 | Sitemap Extractor | Нет | Все URL из sitemap без краула |
| 6 | SERP Similarity | Опц. | Пересечение выдачи двух ключей |
| 7 | SERP UULE | Нет | Google SERP по гео (UULE) |
| 8 | SERP Extractor | Опц. | Titles, URLs, featured snippets, SERP features |
| 9 | Keyword Explorer | Да | Volume, KD, trends, конкуренты в SERP |
| 10 | Content Gap | Да | Bulk-проверка упоминаний ключей на страницах |
| 11 | Bulk Analysis | Да | Backlink/traffic на 1000 URL |
| 12 | Google Search Console (live) | Нет | OAuth, indexing dashboard, keyword-in-page, SEO tests, topic clusters |
| 13 | Bulk Google PAA | Нет | People Also Ask по списку ключей |
| 14 | Bulk Autocomplete (Google/Bing) | Нет | Long-tail через модификаторы |
| 15 | Auto Indexing | Нет | Google Service Account → bulk Indexing API |
| 16 | IndexNow | Нет | Bulk submit Bing/Yandex/Naver/… |
| 17 | Bulk SEO Metadata Optimizer | Нет | AI titles/meta/H1; cloud или local LLM; WordPress |
| 18 | Content Struct | Нет | Top-20 SERP → headings/meta → AI outline |
| 19 | Backlink Gap | Да | Сравнение профилей с конкурентами |
| 20 | GMB / Local Grid Rank Tracker | Опц. | Карта Google Maps, grid/circle/polygon |
| 21 | N.A.P Finder | Опц. | Поиск цитирований NAP в сети |
| 22 | Organic Rank Tracker | Опц. | Unlimited keywords, schedule, geo, SERP features, PAA depth, pixels-from-top |
| 23 | LLM Rank Tracker | Да | AI Overview, AI Mode, ChatGPT mentions/citations |
| 24 | NLP Text Analysis | Нет | Google NLP / TextRazor / Dandelion, 20+ языков |
| 25 | Bulk Check Mentions | Нет | Keyword × URL: title, H1–H6, meta, body |
| 26 | Log File Analysis | Нет | Googlebot, Bingbot, AI bots (GPTBot, ClaudeBot, …) |
| 27 | White-labeled Client Report | Нет | Hosted link, logo, password, auto-update |
| 28 | Automations | Нет | PDF/email/webhook после rank snapshot |
| 29 | Workspace | Нет | Изоляция клиентов/кампаний |
| 30 | Embedding Database | Нет | Локальные embeddings для семантики |
| 31 | MCP Server | — (competitor) | — |
| 32 | Saved Keywords | Нет | Списки, теги, CSV metrics |
| 33 | SEO Tests (GSC) | Нет | Time-based / URL switch / split tests |
| 34 | Local SERP Checker | — | Локальная выдача |
| 35 | Google Business Reviews | — | Fetch отзывов |
| 36 | Content Explorer | soon | Ideation |
| 37 | SERP Diff | soon | Diff выдачи между датами |

Дополнительно с лендинга: proxies для SERP, migration tools, SMTP, GA4 guide, dashboard rank overview, экспорт в Google Drive/Zimmwriter.

**Модель монетизации SEO Utils:** license + optional DataForSEO (pay-as-you-go) + optional cloud AI keys.

---

## 3. Матрица покрытия OpenSpider

Легенда: **✓** parity / готово · **~** partial · **—** нет · **API** нужна внешняя интеграция · **⊘** out of scope.

### 3.1. Уже есть (parity или близко)

| SEO Utils | OpenSpider | Где в коде / UI |
|-----------|------------|-----------------|
| Desktop local app | ✓ MIT, без URL-квот | Electron, `README.md` |
| Site spider / crawl | ✓ Unlimited HTTP | `main/crawl/crawl-engine.ts` |
| robots.txt + sitemap seed | ✓ | `robots.service`, `fetchSitemapUrls` |
| On-page (title, meta, H1, canonical) | ✓ + расширенные issues | `issue-detector.ts` |
| Structured data / JSON-LD | ✓ | issues + page drawer |
| hreflang | ✓ reciprocal check | issues + Googlebot |
| Internal links / orphans / depth | ✓ + graph | `internal-links`, Visualization |
| Broken URLs in crawl | ~ 4xx/5xx только URL в обходе | `IssueCode` http.* |
| PageSpeed / CWV | ✓ PSI + local LH | `pagespeed.service.ts`, Labs |
| SERP preview (snippet) | ✓ pixel-ish | PageSeoDrawer, PreviewCards |
| Social preview (OG/Twitter) | ✓ | PreviewCards |
| IndexNow | ✓ bulk submit | `indexnow.service.ts`, Labs |
| Sitemap (generate) | ✓ из краула | `sitemap.service`, Labs export |
| llms.txt / GEO signal | ✓ probe + issue | `llms-txt.service.ts` |
| Rank probe | ~ on-demand, Google/Bing/Yandex/DDG | `serp.service.ts`, Metrics |
| Rank history | ~ после probe | `rank-store.ts`, RankHistoryChart |
| GSC / Webmaster / GA4 | ~ CSV overlay | import-store, Integrations |
| Яндекс Метрика | ✓ API token | `metrika.service.ts` |
| Backlinks metrics | ~ CSV overlay | Integrations |
| Local NAP | ~ JSON-LD на сайте, не web citations | `local.nap.incomplete` |
| PDF report | ✓ local printToPDF | Reports |
| JSON export | ✓ v2 | Reports |
| Scheduling | ~ hourly/daily, app open | Crawl Schedule |
| Custom extract / regex / JS | ✓ | Labs Custom tools |
| AI page audit | ~ first 5 pages | Labs AI scan |
| Googlebot fetch | ✓ desktop/mobile/lang | `googlebot-view.service.ts` |
| List / competitor crawl | ✓ list mode | crawl config |
| Health score + recommendations | ✓ | Dashboard, Metrics, PDF |
| Full audit pipeline | ✓ crawl+LH+SERP+llms | `full-audit.service.ts` |

### 3.2. Missing — high value (можно из crawl/HTML/PSI без их backend)

| SEO Utils | Gap | Effort | Почему реализуемо локально |
|-----------|-----|--------|----------------------------|
| Bulk Check Mentions | — | **S** | Keyword list × stored HTML после краула |
| Sitemap Extractor (standalone) | ~ логика есть, нет UI | **S** ✓ | `fetchSitemapUrls` + Labs UI |
| Outbound broken links | — | **M** ✓ | HEAD/GET по `<a href>` из stored HTML (linkinator-паттерн) |
| Organic Rank Tracker (UI) | ~ probe есть, нет tracker entity | **M** | Keyword lists + schedule + history charts |
| SERP features / Extractor lite | ~ базовый rank | **M** | Parse SERP HTML: PAA box, featured snippet flags |
| Log File Analysis | — | **M** | Parse локальных access.log, bot taxonomy |
| Content Struct lite | — | **M** | SERP top-N scrape + heading table (без AI outline — MVP) |
| Bulk metadata suggestions | — | **M** | Rule-based из issues; опционально OpenAI key user'а |
| Bulk Autocomplete / PAA | — | **M** | Chromium scrape (как SERP probe) |
| Semantic clustering | — | **L** | Local embeddings (transformers.js / onnx) на keyword list |
| SERP clustering | — | **L** | SERP overlap matrix + own IP scraping |
| White-label PDF | ~ PDF есть | **S** | Logo/colors в шаблоне — без hosted links |
| Crawl run diff | — (compare reports удалён) | **M** | Diff issues/pages между прогонами |

### 3.3. Missing — needs API / integration

| SEO Utils | Gap | Effort | Зависимость |
|-----------|-----|--------|-------------|
| Live GSC OAuth | roadmap | **L** | Google OAuth, Search Console API |
| GSC SEO Tests / indexing dashboard | — | **L** | GSC API + UI |
| Keyword Explorer (volume/KD) | — | **L** | DataForSEO / GKP API / SerpAPI |
| Backlinks / Traffic Analytics | — | **L** | DataForSEO BYO adapter |
| Backlink Gap | — | **L** | DataForSEO |
| LLM Rank Tracker | — | **L** | DataForSEO или heavy AI SERP scraping |
| GMB / Local Grid Tracker | — | **L** | DataForSEO Maps или custom grid scrape |
| N.A.P Finder (web) | — | **M–L** | Citation APIs или custom crawl |
| Auto Indexing (Google) | — | **M** | Service Account; только eligible URL types |
| WordPress publish | — | **M** | WP REST + Yoast/Rank Math meta |
| Hosted white-label reports | — | **L** | Backend + CDN (против local-first) |
| Proxies SERP at scale | — | **M** | User-provided proxy config |
| NLP Text Analysis | — | **M** | Google NLP / TextRazor / Dandelion API keys |

### 3.4. Skip / out of scope

| SEO Utils | Решение OpenSpider |
|-----------|-------------------|
| LemonSqueezy licensing / checkout | MIT OSS, без billing |
| Rent DataForSEO API key | User BYO only, без посредника |
| Workspace SaaS multi-tenant | Projects per site достаточно |
| S3 cache sharing между устройствами | Migration via JSON export |
| SMTP email automations | Backlog после webhooks |
| Их UI/брендинг/видео/assets | Свой UX |
| Content Explorer / SERP Diff (their vNext) | Watch; не копировать вслепую |

---

## 4. Приоритетный backlog (tracer bullets)

Rough effort: **S** ≤ 3 дня · **M** 1–2 нед · **L** 3+ нед.

| # | Фича | Effort | Обоснование |
|---|------|--------|-------------|
| 1 | **Outbound broken link checker** | M | Главный gap vs Screaming Frog и ожидание «spider»; данные уже в HTML краула |
| 2 | **Bulk Check Mentions** | S | Прямой parity SEO Utils §Bulk Check; без API |
| 3 | **Sitemap Extractor в Labs** | S | `fetchSitemapUrls` готов — экспорт CSV/список URL |
| 4 | **Organic Rank Tracker module** | M | Keyword lists, geo/lang, schedule, competitor column — ядро SEO Utils |
| 5 | **SERP features в probe** | M | PAA presence, featured snippet, local pack flag — дешевле DataForSEO |
| 6 | **Log File Analysis** | M | Уникальный selling SEO Utils; полностью offline |
| 7 | **Live GSC OAuth (MVP: indexing status)** | L | Roadmap OpenSpider; overlay clicks/impressions + «indexed?» |
| 8 | **Content Struct lite** | M | Top-10 SERP headings table → optional AI outline (user key) |
| 9 | **Semantic keyword clustering** | L | Local embeddings; дифференциатор vs SaaS credits |
| 10 | **BYO DataForSEO adapter (optional)** | L | Backlinks/traffic для тех, кто уже платит DFS |
| 11 | **Crawl diff / compare runs** | M | Вернуть lighter diff (issues Δ, URL Δ) без старого compare UI |

---

## 5. Рекомендуемый следующий slice

**Slice A (2–3 недели, без внешних API):**

- [x] Bulk Check Mentions (S) — Labs → «Доп. инструменты» → «Массовая проверка упоминаний»  
- [x] Sitemap Extractor UI (S) — Labs → «Извлечение URL из sitemap»  
- [x] Outbound broken links (M) — Labs + Issues `links.outbound.broken`  

**Slice B (следом):**

4. Organic Rank Tracker shell (M)  
5. SERP features flags (M)  

**Slice C (квартал):**

6. GSC OAuth MVP (L)  
7. Log File Analysis (M)  

Не трогать в этом slice: `crawl-engine` dedup/resume (параллельная работа другого агента).

---

## 6. Карта модулей OpenSpider

Полный реестр: `src/shared/const/seo-modules.const.ts` (38 модулей, status ready).

Связанные документы:

- [`README.md`](./README.md) — эксплуатационный каталог возможностей  
- [`docs/OSS-SEO-LANDSCAPE-REPORT.md`](./docs/OSS-SEO-LANDSCAPE-REPORT.md) — wider OSS ecosystem  
- [`docs/SF-FEATURE-MATRIX.md`](./docs/SF-FEATURE-MATRIX.md) — Screaming Frog parity  

---

## 7. Риски и честные ограничения

| Риск | Митигация |
|------|-----------|
| Гонка за feature-parity с SEO Utils без DataForSEO | Позиционировать crawl+audit; rank/cluster — «good enough» на own IP |
| SERP scraping blocks | Proxies user-BYO; optional SERP API adapter |
| LLM Rank Tracker без API | Не обещать ChatGPT parity; llms.txt + shadow risk уже есть |
| Re-add compare reports | Новый diff UX, не копировать удалённый flow |

---

## 8. seo.utils.com (utils.com) — отдельный продукт

**Дата инвентаризации:** 2026-07-28  
**Сайт:** [seo.utils.com](https://seo.utils.com/) — бесплатные **онлайн** client-side утилиты (семейство utils.com).  
**Не путать с:** [seoutils.app](https://seoutils.app/) — платный **desktop** SEO suite (rank tracker, GSC, clustering).

| # | Инструмент seo.utils.com | OpenSpider | Gap / примечание |
|---|--------------------------|------------|------------------|
| 1 | Broken Link Checker | ~ ✓ Slice A outbound + crawl 4xx | Desktop crawl-scale |
| 2 | Canonical URL Checker | ✓ issues | — |
| 3 | Core Web Vitals Checker | ✓ PSI + local LH | — |
| 4 | Favicon Check | — | **S** — issue `meta.favicon.missing` |
| 5 | Heading Structure (H1–H6) | ✓ issues + drawer | — |
| 6 | Keyword Density | ~ topKeywords per page | **S** — bulk density table in Labs |
| 7 | Meta Tag generator | ~ SERP preview | **S** — editor, not generator clone |
| 8 | Mobile-Friendly Test | ✓ viewport issue + LH | — |
| 9 | Open Graph Tags | ✓ PreviewCards + issues | — |
| 10 | Page Load Time / waterfall | ~ PSI TTFB | **M** — redirect chain + timing panel |
| 11 | Page Title & Description | ✓ crawl table + drawer | — |
| 12 | Redirect Checker | ~ per-page redirect flag | **M** — full chain tracer |
| 13 | robots.txt analyzer | ✓ robots.service | **S** — standalone Labs parse |
| 14 | SEO Optimized Checklist | ✓ health + issues | — |
| 15 | Structured Data generator | ~ JSON-LD issues | skip generator clone |
| 16 | Time on Page Tracker | — | ⊘ SaaS/embed analytics |
| 17 | Twitter Card generator | ✓ PreviewCards | — |
| 18 | XML Sitemap generator | ✓ export from crawl | Extractor ✓ Slice A |

**Новые пункты backlog (из seo.utils.com, не было в §3.2):**

| Фича | Effort | Обоснование |
|------|--------|-------------|
| Redirect chain tracer | M | utils.com Redirect Checker; дополняет `http.redirect` |
| Keyword density table (bulk) | S | utils.com Keyword Density × crawl pages |
| Favicon validation issue | S | utils.com Favicon Check |
| robots.txt standalone parser UI | S | utils.com robots.txt tool |
| Page timing waterfall lite | M | utils.com Page Load Time (DNS/connect/TTFB) |

---

*Документ основан только на публичных материалах SEO Utils и фактическом коде OpenSpider. Не является юридической оценкой.*
