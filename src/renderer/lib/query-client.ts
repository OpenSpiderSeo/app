import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      },
    },
  });
}
