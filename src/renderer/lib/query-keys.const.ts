/** Query keys для TanStack Query — стабильные, гранулярные. */
export const QueryKey = {
  AppInfo: ['app', 'info'] as const,
  CrawlProgress: ['crawl', 'progress'] as const,
  CrawlPages: ['crawl', 'pages'] as const,
  CrawlIssues: ['crawl', 'issues'] as const,
  CrawlMeta: ['crawl', 'meta'] as const,
  QuickStartPipeline: ['pipeline', 'quickstart'] as const,
  Integrations: ['integrations', 'list'] as const,
  Projects: ['projects', 'list'] as const,
  ActiveProject: ['projects', 'active'] as const,
  ProjectMemory: ['projects', 'memory'] as const,
  HistoryList: (projectId: string) => ['history', 'list', projectId] as const,
  /** Last FullAuditResult for dashboard / metrics hydration. */
  LastAudit: (projectId: string) => ['audit', 'last', projectId] as const,
} as const;
