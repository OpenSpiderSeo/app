import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from '@renderer/app/App';
import { I18nProvider } from '@renderer/i18n/I18nProvider';
import { ProjectProvider } from '@renderer/features/projects/ProjectProvider';
import { SystemLoadProvider } from '@renderer/features/shell/SystemLoadProvider';
import { createQueryClient } from '@renderer/lib/query-client';
import { installOpenSpiderApi } from './api/client';
import '@renderer/styles/index.css';

installOpenSpiderApi();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

function Root() {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ProjectProvider>
          <SystemLoadProvider>
            <App />
          </SystemLoadProvider>
        </ProjectProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
