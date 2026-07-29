import { memo, useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { useCrawlPages } from '../crawl/use-crawl-queries';
import { buildPagePreview } from '../../../shared/utils/page-preview.utils';
import { PreviewCards } from '../preview/PreviewCards';

/** Labs custom tools — HTML search/extract/JS/AI not in Go engine yet. */
export const CustomToolsPanel = memo(function CustomToolsPanel() {
  const { t } = useI18n();
  const { data: pages = [] } = useCrawlPages();
  const sample = useMemo(() => pages[0] ?? null, [pages]);

  return (
    <div className="grid gap-4">
      {sample ? (
        <article className="admin-panel flex flex-col gap-3 p-4">
          <h3 className="font-display text-base font-semibold">{t('preview.toolsSample')}</h3>
          <p className="text-sm text-[var(--os-muted)]">
            <AnalyzeUrl url={sample.url} compact preferPage={false} />
          </p>
          <PreviewCards data={buildPagePreview(sample)} />
        </article>
      ) : null}

      <article className="admin-panel flex flex-col gap-2 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.customJs.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('feature.unavailable')}</p>
        <p className="text-sm text-[var(--os-muted)]">
          {t('labs.search.title')} · {t('labs.extract.title')} · {t('labs.aiScan.title')}
        </p>
      </article>
    </div>
  );
});
