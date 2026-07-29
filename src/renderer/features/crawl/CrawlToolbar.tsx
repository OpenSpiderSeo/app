import { memo, useEffect, useRef, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { crawlProgressPct } from '../../../shared/utils/crawl-progress.utils';
import { useProject } from '../projects/ProjectProvider';
import { useCrawlActions, useCrawlProgress } from './use-crawl-queries';
import { CrawlLiveStats } from './CrawlLiveStats';

interface CrawlUrlControlsProps {
  running: boolean;
  paused: boolean;
  busy: boolean;
  seedStartUrl: string | null;
}

/** URL field + action buttons — isolated from high-frequency progress ticks. */
const CrawlUrlControls = memo(function CrawlUrlControls({
  running,
  paused,
  busy,
  seedStartUrl,
}: CrawlUrlControlsProps) {
  const { t } = useI18n();
  const { start, stop, pause, resume } = useCrawlActions();
  const [url, setUrl] = useState(seedStartUrl ?? '');
  const lastSeed = useRef(seedStartUrl);

  useEffect(() => {
    if (!seedStartUrl || seedStartUrl === lastSeed.current) return;
    lastSeed.current = seedStartUrl;
    setUrl(seedStartUrl);
  }, [seedStartUrl]);

  // Project / progress loaded after first paint — fill empty field once.
  useEffect(() => {
    if (url.trim() || !seedStartUrl) return;
    lastSeed.current = seedStartUrl;
    setUrl(seedStartUrl);
  }, [seedStartUrl, url]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField className="min-w-[320px] flex-1" value={url} onChange={setUrl}>
        <Label>{t('crawl.startUrl')}</Label>
        <Input placeholder={t('crawl.placeholder')} data-testid="crawl-url" />
      </TextField>
      <Button
        variant="primary"
        data-testid="crawl-start"
        isDisabled={running || paused || !url.trim() || start.isPending}
        onPress={() => start.mutate(url.trim())}
      >
        {t('crawl.start')}
      </Button>
      {paused ? (
        <Button
          variant="primary"
          data-testid="crawl-resume"
          isDisabled={resume.isPending}
          onPress={() => resume.mutate()}
        >
          {t('crawl.resume')}
        </Button>
      ) : (
        <Button
          variant="secondary"
          data-testid="crawl-pause"
          isDisabled={!running || pause.isPending}
          onPress={() => pause.mutate()}
        >
          {t('crawl.pause')}
        </Button>
      )}
      <Button
        variant="secondary"
        data-testid="crawl-stop"
        isDisabled={!running && !paused}
        onPress={() => stop.mutate()}
      >
        {t('crawl.stop')}
      </Button>
    </div>
  );
});

interface CrawlProgressStripProps {
  progress: NonNullable<ReturnType<typeof useCrawlProgress>['data']>;
  showBar: boolean;
}

/** Live counters + blade — re-renders on each crawl progress IPC event. */
const CrawlProgressStrip = memo(function CrawlProgressStrip({
  progress,
  showBar,
}: CrawlProgressStripProps) {
  const { t } = useI18n();
  const { status } = progress;
  const statusKey = `crawl.status.${status}` as MessageKey;
  const paused = status === 'paused';
  const pct = crawlProgressPct(progress);

  return (
    <>
      <CrawlLiveStats progress={progress} />
      {paused ? <p className="text-xs text-[var(--os-muted)]">{t('crawl.resumeHint')}</p> : null}
      {showBar ? (
        <div
          className="crawl-blade"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={pct != null ? `${pct}%` : t('crawl.stats.indeterminate')}
          aria-label={t(statusKey)}
        >
          <div
            className={`crawl-blade__fill ${pct == null ? 'crawl-blade__fill--indeterminate' : ''}`}
            style={pct != null ? { width: `${pct}%` } : undefined}
          />
        </div>
      ) : null}
    </>
  );
});

interface CrawlToolbarProps {
  busy: boolean;
}

export const CrawlToolbar = memo(function CrawlToolbar({ busy }: CrawlToolbarProps) {
  const { active } = useProject();
  const { data: progress = null } = useCrawlProgress();
  const status = progress?.status ?? 'idle';
  const paused = status === 'paused';
  const running = status === 'running' || status === 'pausing' || busy;
  const projectUrl = active?.startUrl?.trim() || null;
  const progressUrl = progress?.startUrl?.trim() || null;
  // Idle → prefer project start URL (full domain), not example.com fallback.
  const seedStartUrl =
    running || paused || status === 'stopping' ? progressUrl || projectUrl : projectUrl || progressUrl;

  return (
    <div className="admin-panel flex flex-col gap-4 p-4">
      <CrawlUrlControls
        running={running}
        paused={paused}
        busy={busy}
        seedStartUrl={seedStartUrl}
      />
      <CrawlProgressStrip
        progress={
          progress ?? {
            status,
            fetched: 0,
            queued: 0,
            active: 0,
            errors: 0,
            startedAt: null,
            finishedAt: null,
            startUrl: null,
          }
        }
        showBar={running || paused}
      />
    </div>
  );
});
