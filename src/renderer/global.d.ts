import type { OpenSpiderApi } from '../shared/types/ipc.types';

declare global {
  interface Window {
    openspider: OpenSpiderApi;
  }
}

export {};
