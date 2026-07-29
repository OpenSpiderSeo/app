import { memo, useState } from 'react';
import type { PagePreviewData } from '../../../shared/types/preview.types';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { OpenExternalImage } from '../../components/OpenExternalImage';
import { SerpPreview } from '../serp-preview/SerpPreview';
import { SocialSharePreview } from './SocialSharePreview';
import { useI18n } from '../../i18n/I18nProvider';

export interface PreviewCardsProps {
  data: PagePreviewData;
  compact?: boolean;
}

type SocialVariant = 'facebook' | 'telegram' | 'twitter';

function PreviewImageMeta({
  label,
  url,
}: {
  label: string;
  url: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="preview-image-meta">
      <span className="preview-image-meta__label">{label}</span>
      {url ? (
        <div className="preview-image-meta__row">
          <OpenExternalImage url={url} />
          <AnalyzeUrl url={url} compact preferPage={false} className="preview-image-meta__url-link" />
        </div>
      ) : (
        <span className="preview-image-meta__missing">{t('preview.imageNone')}</span>
      )}
    </div>
  );
}

export const PreviewCards = memo(function PreviewCards({ data, compact = false }: PreviewCardsProps) {
  const { t } = useI18n();
  const [socialVariant, setSocialVariant] = useState<SocialVariant>('facebook');

  if (compact) {
    return (
      <div className="preview-cards preview-cards--compact">
        <div className="preview-cards__col">
          <p className="preview-cards__label">{t('preview.serp')}</p>
          <SerpPreview
            theme="carbon"
            title={data.serpTitle}
            url={data.url}
            description={data.serpDescription}
          />
        </div>
        <div className="preview-cards__col preview-cards__col--social">
          <div className="preview-cards__social-head">
            <p className="preview-cards__label">{t('preview.social')}</p>
            <div className="preview-social-tabs" role="tablist" aria-label={t('preview.social')}>
              {(
                [
                  ['facebook', t('preview.facebook')],
                  ['telegram', t('preview.telegram')],
                  ['twitter', 'X'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={socialVariant === id}
                  className={`preview-social-tabs__btn${socialVariant === id ? ' is-active' : ''}`}
                  onClick={() => setSocialVariant(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <SocialSharePreview
            variant={socialVariant}
            compact
            title={data.socialTitle}
            description={data.socialDescription}
            domain={data.domain}
            image={data.socialImage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="preview-cards">
      <div className="preview-cards__col">
        <p className="preview-cards__label">{t('preview.serp')}</p>
        <div className="mb-2 min-w-0">
          <AnalyzeUrl url={data.url} compact preferPage={false} />
        </div>
        <SerpPreview
          title={data.serpTitle}
          url={data.url}
          description={data.serpDescription}
        />
      </div>
      <div className="preview-cards__col">
        <p className="preview-cards__label">{t('preview.social')}</p>
        <div className="preview-cards__images">
          <PreviewImageMeta label={t('preview.ogImageTag')} url={data.ogImage} />
          <PreviewImageMeta label={t('preview.twitterImageTag')} url={data.twitterImage} />
        </div>
        <div className="preview-cards__social-grid">
          <div>
            <p className="preview-cards__sublabel">{t('preview.facebook')}</p>
            <SocialSharePreview
              variant="facebook"
              title={data.socialTitle}
              description={data.socialDescription}
              domain={data.domain}
              image={data.socialImage}
            />
          </div>
          <div>
            <p className="preview-cards__sublabel">{t('preview.telegram')}</p>
            <SocialSharePreview
              variant="telegram"
              title={data.socialTitle}
              description={data.socialDescription}
              domain={data.domain}
              image={data.socialImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
