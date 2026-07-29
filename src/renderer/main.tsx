import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { I18nProvider } from './i18n/I18nProvider';
import { ProjectProvider } from './features/projects/ProjectProvider';
import { SystemLoadProvider } from './features/shell/SystemLoadProvider';
import { createQueryClient } from './lib/query-client';
import './styles/index.css';

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
