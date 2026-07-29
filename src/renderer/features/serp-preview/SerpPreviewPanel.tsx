import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { useCrawlPages, useCrawlProgress } from '../crawl/use-crawl-queries';
import { buildPagePreview } from '../../../shared/utils/page-preview.utils';
import { PreviewCards } from '../preview/PreviewCards';

export const SerpPreviewPanel = memo(function SerpPreviewPanel() {
  const { t } = useI18n();
  const { data: progress } = useCrawlProgress();
  const { data: pages = [] } = useCrawlPages();

  const startUrl = progress?.startUrl || 'https://example.com/';
  const firstPage = pages.find((p) => p.url === startUrl) ?? pages[0];

  if (!firstPage) {
    return (
      <article className="admin-panel flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold">{t('serpPreview.title')}</h3>
          <p className="mt-1 text-sm text-[var(--os-muted)]">{t('serpPreview.empty')}</p>
        </div>
      </article>
    );
  }

  const preview = buildPagePreview(firstPage);

  return (
    <article className="admin-panel flex flex-col gap-3 p-4">
      <div>
        <h3 className="font-display text-base font-semibold">{t('serpPreview.title')}</h3>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('serpPreview.body')}</p>
        <div className="mt-1 min-w-0">
          <AnalyzeUrl url={firstPage.url} compact preferPage={false} />
        </div>
      </div>
      <PreviewCards data={preview} />
    </article>
  );
});
