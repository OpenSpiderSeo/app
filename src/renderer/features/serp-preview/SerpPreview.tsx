import { memo } from 'react';

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

function formatDisplayUrl(url: string): string {
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    const pathPart = u.pathname === '/' ? '' : u.pathname;
    return `${u.hostname}${pathPart}`;
  } catch {
    return url;
  }
}

export interface SerpPreviewProps {
  title: string;
  url: string;
  description: string;
  /** Carbon dark shell for narrow sidebars; default mimics Google SERP */
  theme?: 'google' | 'carbon';
}

export const SerpPreview = memo(function SerpPreview({
  title,
  url,
  description,
  theme = 'google',
}: SerpPreviewProps) {
  const displayTitle = truncate(title || url, 60);
  const displayDesc = truncate(description, 155);
  const displayUrl = formatDisplayUrl(url);

  if (theme === 'carbon') {
    return (
      <div className="serp-preview serp-preview--carbon">
        <div className="serp-preview__url">{displayUrl}</div>
        <div className="serp-preview__title">{displayTitle}</div>
        <div className="serp-preview__desc">{displayDesc || '—'}</div>
      </div>
    );
  }

  return (
    <div className="serp-preview serp-preview--google">
      <div className="serp-preview__url">{displayUrl}</div>
      <div className="serp-preview__title">{displayTitle}</div>
      <div className="serp-preview__desc">{displayDesc || '—'}</div>
    </div>
  );
});
