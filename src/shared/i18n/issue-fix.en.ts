/** How-to-fix copy for every IssueCode (EN). */
export const issueFixEn = {
  'issues.fix.title': 'How to fix',
  'issues.fix.why': 'Why it matters',
  'issues.fix.how': 'What to do',
  'issues.fix.found': 'What we found',
  'issues.fix.method': 'How we detected it',
  'issues.fix.better': 'Recommended fix',
  'issues.fix.pick': 'Select a row in List — the fix guide for that issue appears here.',
  'issues.fix.close': 'Close',
  'issues.fix.backToList': 'Back to list',
  'issues.fix.openList': 'Open list',

  'fix.http.4xx.title': 'HTTP 4xx client error',
  'fix.http.4xx.why':
    'Search engines and users cannot open the page. Broken URLs waste crawl budget and hurt UX.',
  'fix.http.4xx.how':
    '1) Open the URL and confirm the status.\n2) If the page moved — set a 301 to the new URL and update internal links.\n3) If the page is gone — return 410 or remove links/sitemap entries.\n4) Fix soft-404s that return 200 with “not found” content.',

  'fix.http.5xx.title': 'HTTP 5xx server error',
  'fix.http.5xx.why':
    'Server failures block indexing and conversions; Google may temporarily demote unstable URLs.',
  'fix.http.5xx.how':
    '1) Check server/app logs for the failing URL.\n2) Fix crashes, timeouts, DB errors, bad deploys.\n3) Verify after fix with another crawl.\n4) If overload — raise capacity or cache; avoid long outages.',

  'fix.http.redirect.title': 'HTTP redirect',
  'fix.http.redirect.why':
    'Redirects are fine when intentional; chains and loops waste crawl budget and dilute signals.',
  'fix.http.redirect.how':
    '1) Prefer one hop: A → final B (301 for permanent).\n2) Point internal links and sitemap to the final URL.\n3) Remove redirect chains (A→B→C).\n4) Keep temporary 302 only when the change is short-lived.',

  'fix.meta.title.missing.title': 'Missing title',
  'fix.meta.title.missing.why':
    'Without <title> the SERP snippet is weak and relevance signals are unclear.',
  'fix.meta.title.missing.how':
    '1) Add a unique <title> per page in the template/CMS.\n2) Put the primary keyword near the start.\n3) Aim ~30–60 characters; include brand only if space allows.\n4) Recrawl and confirm the title in the crawl table.',

  'fix.meta.title.duplicate.title': 'Duplicate title',
  'fix.meta.title.duplicate.why':
    'Identical titles make pages compete with each other and blur CTR in search results.',
  'fix.meta.title.duplicate.how':
    '1) List all URLs sharing the title.\n2) Write a unique title that reflects each page’s intent.\n3) Fix template bugs that reuse one title site-wide.\n4) For near-identical pages — consolidate or differentiate content + titles.',

  'fix.meta.title.short.title': 'Title too short',
  'fix.meta.title.short.why':
    'Very short titles underuse the SERP line and often lack clear intent.',
  'fix.meta.title.short.how':
    '1) Expand to roughly 30–60 characters.\n2) Add the main topic / modifier (city, year, product type).\n3) Keep it readable — no stuffing.\n4) Recrawl to verify length.',

  'fix.meta.title.long.title': 'Title too long',
  'fix.meta.title.long.why':
    'Long titles get truncated in SERPs; important words may be cut off.',
  'fix.meta.title.long.how':
    '1) Shorten toward ~60 characters (pixel width varies).\n2) Keep the unique value proposition first.\n3) Move secondary phrases into the meta description or H1.\n4) Recrawl and check the snippet.',

  'fix.meta.description.missing.title': 'Missing meta description',
  'fix.meta.description.missing.why':
    'Without a description Google may invent a poor snippet — lower CTR.',
  'fix.meta.description.missing.how':
    '1) Add a unique meta description (~70–160 chars).\n2) Summarize the page benefit and include a soft CTA.\n3) Mentions of the query help CTR, not rankings directly.\n4) Recrawl to confirm.',

  'fix.meta.description.duplicate.title': 'Duplicate meta description',
  'fix.meta.description.duplicate.why':
    'Same snippets across URLs look spammy and fail to differentiate pages.',
  'fix.meta.description.duplicate.how':
    '1) Find the URL group with the same description.\n2) Rewrite each description for that page’s intent.\n3) Fix CMS defaults that copy one description everywhere.',

  'fix.meta.description.short.title': 'Meta description too short',
  'fix.meta.description.short.why':
    'Short descriptions leave unused SERP space and weak persuasion.',
  'fix.meta.description.short.how':
    '1) Expand to about 70–160 characters.\n2) State what the page offers and for whom.\n3) Avoid fluff; keep one clear CTA.',

  'fix.meta.description.long.title': 'Meta description too long',
  'fix.meta.description.long.why':
    'Overlong descriptions are truncated; the CTA may disappear.',
  'fix.meta.description.long.how':
    '1) Cut to ~160 characters (or ~920 pixels).\n2) Put the key benefit first.\n3) Recrawl and review the SERP preview mentally.',

  'fix.meta.description.og_only.title': 'Only og:description (no meta description)',
  'fix.meta.description.og_only.why':
    'Google primarily uses meta name="description" for snippets; og:description alone may not be picked up consistently.',
  'fix.meta.description.og_only.how':
    '1) Add a dedicated <meta name="description" content="…">.\n2) Keep og:description aligned but do not rely on it alone.\n3) Recrawl metaDescriptionOnly.',

  'fix.meta.title.h1_duplicate.title': 'Title equals H1',
  'fix.meta.title.h1_duplicate.why':
    'Identical title and H1 waste an opportunity to reinforce related keywords and clarify intent.',
  'fix.meta.title.h1_duplicate.how':
    '1) Keep title SERP-oriented (brand/modifier).\n2) Make H1 user-facing and slightly broader or more conversational.\n3) They should match intent, not copy verbatim.',

  'fix.meta.title.desc_duplicate.title': 'Title equals meta description',
  'fix.meta.title.desc_duplicate.why':
    'Duplicate text in title and description looks lazy and underuses SERP space.',
  'fix.meta.title.desc_duplicate.how':
    '1) Title = primary topic + hook.\n2) Description = benefit, proof, soft CTA.\n3) Avoid repeating the same sentence.',

  'fix.heading.h1.missing.title': 'Missing H1',
  'fix.heading.h1.missing.why':
    'H1 is the main on-page topic signal for users and parsers.',
  'fix.heading.h1.missing.how':
    '1) Add one clear <h1> matching the page topic.\n2) Align H1 with title intent (not necessarily identical text).\n3) Ensure it is visible in the main content, not only in JS that never renders for bots (until JS render ships).',

  'fix.heading.h1.multiple.title': 'Multiple H1',
  'fix.heading.h1.multiple.why':
    'Several H1s dilute hierarchy; themes become ambiguous.',
  'fix.heading.h1.multiple.how':
    '1) Keep a single H1 for the main topic.\n2) Demote extras to H2/H3.\n3) Check theme/builder blocks that inject extra H1s.',

  'fix.heading.h2.missing.title': 'Missing H2',
  'fix.heading.h2.missing.why':
    'Long pages without subheadings are harder to scan and give weak topical structure signals.',
  'fix.heading.h2.missing.how':
    '1) Break content into logical sections with H2s.\n2) Align H2s with subtopics users search for.\n3) Keep a single H1; use H2 for major sections, H3 for subsections.\n4) Recrawl h2Count on content-rich URLs.',

  'fix.canonical.missing.title': 'Missing canonical',
  'fix.canonical.missing.why':
    'Without a canonical, duplicates (params, trailing slash, HTTP/HTTPS) may compete.',
  'fix.canonical.missing.how':
    '1) Add <link rel="canonical" href="…"> to the preferred URL.\n2) Self-canonical for unique pages.\n3) Align sitemap and internal links with the canonical.\n4) Recrawl.',

  'fix.canonical.off_origin.title': 'Canonical points off-origin',
  'fix.canonical.off_origin.why':
    'Cross-domain canonicals can pass indexing away from your site — often unintended.',
  'fix.canonical.off_origin.how':
    '1) Confirm whether syndication/cross-domain is intended.\n2) If not — set canonical to your own preferred URL.\n3) Fix CDN/staging templates leaking foreign canonicals.',

  'fix.canonical.self_mismatch.title': 'Canonical points elsewhere on-site',
  'fix.canonical.self_mismatch.why':
    'When the crawled URL differs from its canonical, this URL is treated as a duplicate — indexing signals go to the canonical target.',
  'fix.canonical.self_mismatch.how':
    '1) Confirm the canonical target is the URL you want indexed.\n2) If this URL should be primary — self-canonical or remove the tag.\n3) Align internal links and sitemap with the canonical.\n4) Recrawl.',

  'fix.canonical.noindex_mismatch.title': 'noindex with off-self canonical',
  'fix.canonical.noindex_mismatch.why':
    'A noindex page that canonicalizes elsewhere sends mixed indexation signals and may hide the wrong URL.',
  'fix.canonical.noindex_mismatch.how':
    '1) Decide which URL should be indexed — usually remove noindex from the canonical target.\n2) If this URL must stay noindex, use a self-referencing canonical or remove canonical.\n3) Align internal links with the indexable URL.\n4) Recrawl robots + canonical together.',

  'fix.robots.noindex.title': 'noindex detected',
  'fix.robots.noindex.why':
    'noindex blocks search indexing. Critical if used on money pages by mistake.',
  'fix.robots.noindex.how':
    '1) Check meta robots and X-Robots-Tag.\n2) Remove noindex from pages that must rank.\n3) Keep noindex on thank-you, filters, cart, staging — intentionally.\n4) Recrawl and verify in GSC/Webmaster later.',

  'fix.robots.conflict.title': 'Conflicting robots directives',
  'fix.robots.conflict.why':
    'index and noindex in the same robots meta is ambiguous — crawlers may pick unpredictable behavior.',
  'fix.robots.conflict.how':
    '1) Open the page source and find meta name="robots".\n2) Keep a single clear directive (index,follow or noindex,follow).\n3) Remove duplicate/conflicting robots tags from CMS plugins.\n4) Recrawl robotsMeta.',

  'fix.robots.nofollow.title': 'nofollow in robots meta',
  'fix.robots.nofollow.why':
    'Page-level nofollow stops search engines from following outbound links on this URL — rarely intended on money/content pages.',
  'fix.robots.nofollow.how':
    '1) Confirm whether nofollow is intentional (paid/sponsored hubs, untrusted UGC).\n2) Remove nofollow from pages that should pass internal link equity.\n3) Prefer rel="nofollow" on individual untrusted links instead of page-wide.\n4) Recrawl robotsMeta.',

  'fix.content.thin.title': 'Thin content',
  'fix.content.thin.why':
    'Very little text rarely satisfies intent and ranks poorly for competitive queries.',
  'fix.content.thin.how':
    '1) Expand useful content (answers, specs, FAQs) — not fluff.\n2) Merge thin URLs into stronger pages with 301.\n3) For listing pages — add unique intro/copy.\n4) Recrawl word counts.',

  'fix.content.no_images.title': 'Long content without images',
  'fix.content.no_images.why':
    'Visual breaks improve engagement; image search and rich snippets often need at least one relevant image.',
  'fix.content.no_images.how':
    '1) Add at least one informative image (diagram, photo, screenshot).\n2) Use descriptive alt text.\n3) Compress for performance.\n4) Recrawl imagesTotal on long URLs.',

  'fix.content.spell_heuristic.title': 'Content polish flags',
  'fix.content.spell_heuristic.why':
    'Repeated words, shouty ALL-CAPS, or messy punctuation hurt readability and trust.',
  'fix.content.spell_heuristic.how':
    '1) Remove accidental repeated words.\n2) Avoid long ALL-CAPS tokens in titles/body.\n3) Tone down !!! / ??? stacks.\n4) Proofread and recrawl.',

  'fix.content.near_duplicate.title': 'Near-duplicate content',
  'fix.content.near_duplicate.why':
    'Nearly identical pages split signals and create thin-index bloat.',
  'fix.content.near_duplicate.how':
    '1) Compare the flagged URL pair.\n2) Keep one primary page; 301 or noindex the rest.\n3) Differentiate remaining pages with unique value.\n4) Fix templates that reprint the same body.',

  'fix.social.og_title.missing.title': 'Missing og:title',
  'fix.social.og_title.missing.why':
    'Shares on social networks fall back to weak defaults — lower click-through.',
  'fix.social.og_title.missing.how':
    '1) Add og:title (and ideally twitter:title).\n2) Match the share message to the page offer.\n3) Test with a social debugger after deploy.',

  'fix.social.og_image.missing.title': 'Missing og:image',
  'fix.social.og_image.missing.why':
    'Without og:image, link previews look empty and get fewer clicks.',
  'fix.social.og_image.missing.how':
    '1) Add og:image with an absolute HTTPS URL (≥1200×630 recommended).\n2) Compress but keep readability.\n3) Verify the image is crawlable (not blocked by robots).',

  'fix.social.twitter_card.missing.title': 'Missing twitter:card and og:title',
  'fix.social.twitter_card.missing.why':
    'Without twitter:card and og:title, Twitter/X previews fall back to bare URLs — weak social CTR.',
  'fix.social.twitter_card.missing.how':
    '1) Add meta name="twitter:card" (summary or summary_large_image).\n2) Add og:title for all networks.\n3) Pair with og:image for large-image cards.\n4) Test in Twitter Card Validator after deploy.',

  'fix.schema.jsonld.missing.title': 'Missing JSON-LD',
  'fix.schema.jsonld.missing.why':
    'Structured data enables rich results (FAQ, Product, Article, etc.).',
  'fix.schema.jsonld.missing.how':
    '1) Add relevant JSON-LD (schema.org) for the page type.\n2) Validate with Google Rich Results Test.\n3) Keep markup truthful — never fake reviews/prices.\n4) Recrawl jsonLdCount.',

  'fix.schema.jsonld.invalid.title': 'Invalid JSON-LD',
  'fix.schema.jsonld.invalid.why':
    'Broken JSON-LD is ignored by Google — you lose rich-result eligibility without a clear error in Search Console.',
  'fix.schema.jsonld.invalid.how':
    '1) Open the page source and find application/ld+json blocks.\n2) Fix JSON syntax (commas, quotes, trailing junk).\n3) Validate types/properties in Rich Results Test / Schema Markup Validator.\n4) Recrawl until Invalid JSON-LD disappears.',

  'fix.schema.jsonld.weak.title': 'Weak JSON-LD (no @type)',
  'fix.schema.jsonld.weak.why':
    'JSON-LD without @type gives parsers little to work with — rich results are unlikely.',
  'fix.schema.jsonld.weak.how':
    '1) Add @type matching the page (WebPage, Article, Product, etc.).\n2) Include required properties for that type.\n3) Validate in Rich Results Test.\n4) Recrawl jsonLdTypes.',

  'fix.a11y.img.alt_missing.title': 'Images missing alt',
  'fix.a11y.img.alt_missing.why':
    'Missing alt hurts accessibility and image search context.',
  'fix.a11y.img.alt_missing.how':
    '1) Add descriptive alt for informative images.\n2) Use empty alt="" for purely decorative images.\n3) Do not stuff keywords into every alt.\n4) Recrawl imagesMissingAlt.',

  'fix.a11y.img.all_alt_missing.title': 'All images missing alt',
  'fix.a11y.img.all_alt_missing.why':
    'Every image lacks alt text — accessibility and image SEO context are lost site-wide on this page.',
  'fix.a11y.img.all_alt_missing.how':
    '1) Audit each <img> on the page.\n2) Add meaningful alt or alt="" for decorative assets.\n3) Fix CMS defaults that strip alt.\n4) Recrawl until imagesMissingAlt is 0.',

  'fix.a11y.html.lang_missing.title': 'Missing html lang',
  'fix.a11y.html.lang_missing.why':
    'Screen readers and search use html[lang] to pick the correct language voice and relevance.',
  'fix.a11y.html.lang_missing.how':
    '1) Set <html lang="en"> (or your locale, e.g. ru).\n2) Keep lang consistent with the page content.\n3) Recrawl htmlLang.',

  'fix.a11y.button.name_missing.title': 'Buttons without accessible name',
  'fix.a11y.button.name_missing.why':
    'Icon-only / empty buttons are invisible to assistive tech and fail basic WCAG name checks.',
  'fix.a11y.button.name_missing.how':
    '1) Add visible text, aria-label, or aria-labelledby.\n2) Prefer real <button> over clickable divs.\n3) Recrawl buttonsWithoutName.',

  'fix.a11y.skip.missing.title': 'Missing skip link',
  'fix.a11y.skip.missing.why':
    'Skip links let keyboard users bypass repetitive navigation — a basic accessibility expectation.',
  'fix.a11y.skip.missing.how':
    '1) Add an early <a href="#main">Skip to content</a> (or similar).\n2) Ensure the target id exists and is focusable.\n3) Show the link on keyboard focus.\n4) Recrawl hasSkipLink.',

  'fix.a11y.link.name_missing.title': 'Links without accessible name',
  'fix.a11y.link.name_missing.why':
    'Icon-only or empty links are unusable for screen readers and fail WCAG link-purpose checks.',
  'fix.a11y.link.name_missing.how':
    '1) Add visible text or aria-label to each link.\n2) For icon links, describe the destination/action.\n3) Avoid links that wrap images without alt text.\n4) Recrawl linksWithoutAccessibleName.',

  'fix.local.nap.incomplete.title': 'Incomplete local NAP in JSON-LD',
  'fix.local.nap.incomplete.why':
    'LocalBusiness/Organization markup without phone and address weakens local pack, maps, and knowledge-panel signals. Search engines cross-check NAP with Google Business Profile / Yandex Business.',
  'fix.local.nap.incomplete.method':
    'OpenSpider parses every <script type="application/ld+json">, finds LocalBusiness, Organization, and *Business/*Organization types, and checks for telephone (or phone) and address (string or PostalAddress). If either field is missing, the issue is raised.',
  'fix.local.nap.incomplete.better': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Example Cafe",
  "telephone": "+1-555-123-4567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Springfield",
    "postalCode": "01101",
    "addressCountry": "US"
  }
}
</script>`,
  'fix.local.nap.incomplete.how':
    '1) Add telephone and PostalAddress to JSON-LD on this page.\n2) Match NAP to Google Business Profile / Yandex Business — formatting must be consistent.\n3) Use one NAP site-wide (footer, contact page, schema).\n4) Validate in Rich Results Test and recrawl.',

  'fix.mobile.viewport.missing.title': 'Missing viewport meta',
  'fix.mobile.viewport.missing.why':
    'Without viewport, mobile browsers render a desktop layout and hurt usability / mobile SEO signals.',
  'fix.mobile.viewport.missing.how':
    '1) Add <meta name="viewport" content="width=device-width, initial-scale=1">.\n2) Verify responsive CSS.\n3) Recrawl hasViewport.',

  'fix.content.exact_duplicate.title': 'Exact duplicate content',
  'fix.content.exact_duplicate.why':
    'Identical body text across URLs wastes crawl budget and splits ranking signals.',
  'fix.content.exact_duplicate.how':
    '1) Canonicalize to the preferred URL (301 or rel=canonical).\n2) Or differentiate body content meaningfully.\n3) Remove soft duplicates from internal links/sitemap.\n4) Recrawl exact duplicates.',

  'fix.links.orphan.title': 'Orphan page',
  'fix.links.orphan.why':
    'Pages with no internal inlinks are hard to discover and rarely get equity.',
  'fix.links.orphan.method':
    'During crawl OpenSpider counts inlinks — how many other site pages link to each URL. Pages with HTTP 200, depth > 0, and inlinks = 0 are flagged as orphans (start URL excluded).',
  'fix.links.orphan.how':
    '1) Add contextual internal links from related pages.\n2) Include important orphans in navigation/hubs/sitemap.\n3) If obsolete — noindex or 301 to a relevant URL.\n4) Recrawl inlink counts.',

  'fix.links.deep.title': 'Deep page (many clicks from home)',
  'fix.links.deep.why':
    'Very deep URLs get crawled less often and receive weaker internal PageRank.',
  'fix.links.deep.how':
    '1) Shorten path: link from higher-level hubs.\n2) Add breadcrumbs and related blocks.\n3) Promote key deep URLs into category/nav.\n4) Recrawl depth.',

  'fix.intl.hreflang.missing.title': 'Missing hreflang',
  'fix.intl.hreflang.missing.why':
    'On multilingual sites, missing hreflang causes wrong-locale results and duplicates.',
  'fix.intl.hreflang.missing.how':
    '1) Add reciprocal hreflang for each language/region variant.\n2) Include x-default where appropriate.\n3) Use absolute URLs; keep self-references.\n4) Recrawl after deploy.',

  'fix.intl.hreflang.not_reciprocal.title': 'Hreflang not reciprocal',
  'fix.intl.hreflang.not_reciprocal.why':
    'One-way hreflang breaks locale clusters — Google may ignore the annotations.',
  'fix.intl.hreflang.not_reciprocal.how':
    '1) For each A→B hreflang, ensure B→A exists with matching locale codes.\n2) Include self-referencing hreflang on every variant.\n3) Use absolute URLs consistent with canonicals.\n4) Recrawl full site to verify pairs among discovered URLs.',

  'fix.geo.llms_txt.missing.title': 'Missing /llms.txt',
  'fix.geo.llms_txt.missing.why':
    'llms.txt helps AI/search crawlers understand which content to use (emerging GEO practice).',
  'fix.geo.llms_txt.missing.how':
    '1) Publish https://your-domain/llms.txt with key docs/URLs.\n2) Keep it truthful and updated.\n3) Optional — also maintain robots.txt sitemap pointers.\n4) Re-probe in Labs.',

  'fix.http.soft_404.title': 'Soft-404 (200 “not found”)',
  'fix.http.soft_404.why':
    'Returning HTTP 200 for missing pages wastes crawl budget and can dilute index quality.',
  'fix.http.soft_404.how':
    '1) Confirm the page should 404/410 or redirect.\n2) Return a real 404/410 status (or 301 to a replacement).\n3) Remove internal links and sitemap entries to dead URLs.\n4) Recrawl to verify status codes.',

  'fix.content.citability.weak.title': 'Weak citability signals',
  'fix.content.citability.weak.why':
    'Long pages without clear structure/schema are harder for search and AI systems to quote confidently.',
  'fix.content.citability.weak.how':
    '1) Add clear H2 sections that answer distinct questions.\n2) Add JSON-LD (Article/FAQ/HowTo as appropriate).\n3) Lead with a concise answer paragraph.\n4) Keep title/H1 aligned with the primary intent.',

  'fix.links.outbound.broken.title': 'Broken outbound link',
  'fix.links.outbound.broken.why':
    'Dead external links hurt UX and trust; search engines may treat them as quality signals.',
  'fix.links.outbound.broken.how':
    '1) Open the target URL and confirm the status.\n2) Update or remove the link on each source page.\n3) Prefer linking to stable, HTTPS destinations.\n4) Re-run the outbound check in Labs after fixes.',
} as const;
