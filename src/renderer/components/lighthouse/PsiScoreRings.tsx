import { memo } from 'react';
import type { LighthouseScores } from '../../../shared/types/audit.types';
import { ScoreRing } from '../ScoreRing';
import { useI18n } from '../../i18n/I18nProvider';

export const PsiScoreRings = memo(function PsiScoreRings({
  scores,
  size = 72,
}: {
  scores: LighthouseScores;
  size?: number;
}) {
  const { t } = useI18n();

  return (
    <div className="psi-score-rings flex flex-wrap items-start gap-4">
      <ScoreRing score={scores.performance ?? 0} label={t('metrics.lh.perf')} size={size} />
      <ScoreRing score={scores.seo ?? 0} label={t('metrics.lh.seo')} size={size} />
      <ScoreRing score={scores.accessibility ?? 0} label={t('metrics.lh.a11y')} size={size} />
      <div className="psi-score-rings__bp" title={t('metrics.lh.bpHint')}>
        <ScoreRing score={scores.bestPractices ?? 0} label={t('metrics.lh.bp')} size={size} />
        <p className="psi-score-rings__bp-caption">{t('metrics.lh.bpCaption')}</p>
      </div>
    </div>
  );
});
