/** Open http(s) URL in the system browser via Electron shell.openExternal. */
export async function openInBrowser(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const api = window.openspider;
  if (api?.openExternal) {
    await api.openExternal(trimmed);
    return;
  }
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}
