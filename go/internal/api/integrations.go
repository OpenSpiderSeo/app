package api

func defaultIntegrations() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"id":          "google-search-console",
			"name":        "Google Search Console",
			"description": "Clicks, impressions, queries and URL inspection overlay on crawl rows.",
			"status":      "available",
			"docsUrl":     "https://developers.google.com/webmaster-tools",
		},
		{
			"id":          "yandex-metrika",
			"name":        "Яндекс Метрика",
			"description": "Traffic, goals and behaviour metrics for RU/CIS sites.",
			"status":      "available",
			"docsUrl":     "https://yandex.com/dev/metrika/",
		},
		{
			"id":          "yandex-webmaster",
			"name":        "Яндекс Вебмастер",
			"description": "Indexation, sitemap and search queries from Yandex — CSV import overlay.",
			"status":      "available",
			"docsUrl":     "https://yandex.com/dev/webmaster/",
		},
		{
			"id":          "google-analytics-4",
			"name":        "Google Analytics 4",
			"description": "Sessions and engagement overlaid on crawled URLs.",
			"status":      "available",
			"docsUrl":     "https://developers.google.com/analytics",
		},
		{
			"id":          "pagespeed-insights",
			"name":        "PageSpeed Insights / Lighthouse",
			"description": "Core Web Vitals and Lighthouse. Optional psiApiKey raises quota; on HTTP 429 the app falls back to local lab estimates.",
			"status":      "available",
			"docsUrl":     "https://developers.google.com/speed/docs/insights/v5/about",
		},
	}
}

func ossCredits() []map[string]string {
	return []map[string]string{
		{"name": "goquery", "package": "github.com/PuerkitoBio/goquery", "url": "https://github.com/PuerkitoBio/goquery", "license": "BSD-3-Clause", "usedFor": "HTML parse & SEO field extraction"},
		{"name": "Neutralino.js", "package": "@neutralinojs/neutralinojs", "url": "https://neutralino.js.org", "license": "MIT", "usedFor": "Cross-platform desktop shell"},
		{"name": "React", "package": "react", "url": "https://react.dev", "license": "MIT", "usedFor": "UI framework"},
		{"name": "Vite", "package": "vite", "url": "https://vitejs.dev", "license": "MIT", "usedFor": "Frontend bundler"},
	}
}
