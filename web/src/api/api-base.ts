/** Shared HTTP sidecar base URL (Vite define or dev fallback). */
declare const __API_BASE__: string;

export const API_BASE =
  typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : 'http://127.0.0.1:7845';
