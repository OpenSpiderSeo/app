/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __API_BASE__: string;

import type { OpenSpiderApi } from '@shared/types/ipc.types';

declare global {
  interface Window {
    openspider: OpenSpiderApi;
  }
}

export {};
