/** Preview card image URLs — direct + optional Go proxy for WebView/hotlink issues. */

declare const __API_BASE__: string | undefined;

const DEFAULT_API_BASE = 'http://127.0.0.1:7845';

function apiBase(): string {
  return typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : DEFAULT_API_BASE;
}

/** Same-origin Go sidecar URL that fetches remote og:image for in-app preview. */
export function previewImageProxyUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  return `${apiBase()}/api/proxy/image?url=${encodeURIComponent(trimmed)}`;
}

export type PreviewImageLoadMode = 'direct' | 'proxy';

/** Resolve `<img src>` for social preview — proxy mode after direct load fails. */
export function previewImageSrc(
  imageUrl: string | null | undefined,
  mode: PreviewImageLoadMode,
): string | null {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return null;
  return mode === 'proxy' ? previewImageProxyUrl(trimmed) : trimmed;
}
