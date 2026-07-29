/**
 * Hub «Анализ»: три вкладки — сводка, полный аудит, Googlebot.
 * Одна активная панель за раз (без mega-scroll / без HubShell-дубля).
 */
import { memo, useCallback, useEffect, useState } from 'react';
import { MetricsPanel } from '../metrics/MetricsPanel';
import { LabsPanel } from '../labs/LabsPanel';
import { GooglebotPanel } from '../googlebot/GooglebotPanel';
import { useI18n } from '../../i18n/I18nProvider';
import type { NavSectionName } from '../../app/routes.const';
import {
  consumePendingAnalysisSection,
  onAnalysisSectionRequest,
  type AnalysisSectionId,
} from '../../lib/analyze-nav';
import { useCrawlPageCount } from '../crawl/use-crawl-queries';

interface AnalysisPanelProps {
  onNavigate?: (section: NavSectionName) => void;
}

const SECTIONS: readonly AnalysisSectionId[] = ['metrics', 'audit', 'googlebot'] as const;

export const AnalysisPanel = memo(function AnalysisPanel({ onNavigate }: AnalysisPanelProps) {
  const { t } = useI18n();
  const [active, setActive] = useState<AnalysisSectionId>('metrics');
  const { data: pageCount = 0 } = useCrawlPageCount();
  const noCrawl = pageCount === 0;

  const switchSection = useCallback((id: AnalysisSectionId) => {
    setActive(id);
  }, []);

  useEffect(() => {
    const pending = consumePendingAnalysisSection();
    if (pending) setActive(pending);
  }, []);

  useEffect(() => onAnalysisSectionRequest(switchSection), [switchSection]);

  return (
    <section className="analysis-hub">
      <header className="analysis-hub__hero analysis-hub__hero--compact">
        <h1 className="font-display text-2xl font-semibold">{t('analysis.title')}</h1>
      </header>

      <div
        className="analysis-hub__segments"
        role="tablist"
        aria-label={t('analysis.segmentsLabel')}
      >
        {SECTIONS.map((id) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`analysis-tab-${id}`}
              aria-selected={isActive}
              aria-controls={`analysis-pane-${id}`}
              className={`analysis-hub__segment${isActive ? ' is-active' : ''}`}
              onClick={() => switchSection(id)}
            >
              <span className="analysis-hub__segment-label">{t(`analysis.section.${id}`)}</span>
            </button>
          );
        })}
      </div>

      {noCrawl ? (
        <div className="analysis-hub__no-crawl admin-panel p-4" role="status">
          <p className="text-sm font-medium text-[var(--os-ink)]">{t('analysis.noCrawl.banner')}</p>
          <p className="mt-2 text-sm text-[var(--os-muted)]">
            {t(`analysis.noCrawl.${active}Next`)}
          </p>
        </div>
      ) : null}

      <div className="analysis-hub__panes">
        {SECTIONS.map((id) => {
          const isActive = active === id;
          return (
            <section
              key={id}
              id={`analysis-pane-${id}`}
              role="tabpanel"
              aria-labelledby={`analysis-tab-${id}`}
              hidden={!isActive}
              className="analysis-hub__pane"
            >
              {id === 'metrics' ? (
                <MetricsPanel embedded onNavigate={onNavigate} />
              ) : null}
              {id === 'audit' ? <LabsPanel embedded prominentCta /> : null}
              {id === 'googlebot' ? <GooglebotPanel embedded /> : null}
            </section>
          );
        })}
      </div>
    </section>
  );
});
