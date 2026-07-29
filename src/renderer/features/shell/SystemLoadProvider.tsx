import { createContext, memo, useContext, type ReactNode } from 'react';
import type { SystemLoadSnapshot } from '../../../shared/types/ipc.types';
import { useSystemLoadPoll } from './system-load-poll';

const SystemLoadContext = createContext<SystemLoadSnapshot | null>(null);

/** Single IPC poll shared by HUD + sidebar inline meter. */
export const SystemLoadProvider = memo(function SystemLoadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const load = useSystemLoadPoll();
  return <SystemLoadContext.Provider value={load}>{children}</SystemLoadContext.Provider>;
});

export function useSystemLoad(): SystemLoadSnapshot | null {
  return useContext(SystemLoadContext);
}
