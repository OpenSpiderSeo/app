import { memo, useEffect, useState, type MouseEvent } from 'react';
import type { PreviewImageLoadMode } from '../../../shared/utils/preview-image.utils';
import { previewImageSrc } from '../../../shared/utils/preview-image.utils';
import { useI18n } from '../../i18n/I18nProvider';
import { openInBrowser } from '../../lib/open-external';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

export interface SocialSharePreviewProps {
  title: string;
  description: string;
  domain: string;
  image?: string | null;
  variant?: 'facebook' | 'telegram' | 'twitter';
  showImageUrl?: boolean;
  /** Sidebar mode: tighter layout, no image URL footer */
  compact?: boolean;
}

export const SocialSharePreview = memo(function SocialSharePreview({
  title,
  description,
  domain,
  image,
  variant = 'facebook',
  showImageUrl = true,
  compact = false,
}: SocialSharePreviewProps) {
  const { t } = useI18n();
  const [imgMode, setImgMode] = useState<PreviewImageLoadMode | 'rpc' | 'failed'>('direct');
  const [rpcSrc, setRpcSrc] = useState<string | null>(null);

  useEffect(() => {
    setImgMode('direct');
    setRpcSrc(null);
  }, [image]);

  useEffect(() => {
    const trimmed = image?.trim();
    if (imgMode !== 'rpc' || !trimmed) return;
    let alive = true;
    void (async () => {
      try {
        const res = await window.openspider.proxyImageData?.(trimmed);
        if (!alive) return;
        if (res?.ok && res.base64 && res.contentType) {
          setRpcSrc(`data:${res.contentType};base64,${res.base64}`);
        } else {
          setImgMode('failed');
        }
      } catch {
        if (alive) setImgMode('failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, [imgMode, image]);

  const hasImageUrl = Boolean(image?.trim());
  const imgSrc =
    imgMode === 'rpc'
      ? rpcSrc
      : hasImageUrl && imgMode !== 'failed'
        ? previewImageSrc(image, imgMode === 'proxy' ? 'proxy' : 'direct')
        : null;
  const showImage = Boolean(imgSrc);
  const displayTitle = truncate(title || domain, 80);
  const displayDesc = truncate(description, 160);

  const variantClass =
    variant === 'telegram'
      ? 'social-preview--telegram'
      : variant === 'twitter'
        ? 'social-preview--twitter'
        : 'social-preview--facebook';

  const placeholderLabel = !hasImageUrl
    ? t('preview.imageMissing')
    : t('preview.imageBroken');

  const openImage = (e: MouseEvent) => {
    if (!image?.trim()) return;
    e.stopPropagation();
    e.preventDefault();
    void openInBrowser(image.trim());
  };

  const showFooter = showImageUrl && !compact;

  return (
    <div className={`social-preview ${variantClass}${compact ? ' social-preview--compact' : ''}`}>
      {showImage ? (
        <button
          type="button"
          className="social-preview__media is-clickable"
          title={t('preview.openImage')}
          aria-label={t('preview.openImage')}
          onClick={openImage}
        >
          <img
            src={imgSrc!}
            alt=""
            className="social-preview__img"
            referrerPolicy="no-referrer"
            onError={() => {
              setImgMode((mode) => {
                if (mode === 'direct') {
                  if (typeof window.openspider?.proxyImageData === 'function') return 'rpc';
                  return 'proxy';
                }
                return 'failed';
              });
            }}
          />
        </button>
      ) : (
        <div className="social-preview__media social-preview__media--empty">
          <span className="social-preview__placeholder">{placeholderLabel}</span>
        </div>
      )}
      <div className="social-preview__body">
        <div className="social-preview__domain">{domain.toUpperCase()}</div>
        <div className="social-preview__title">{displayTitle}</div>
        {displayDesc ? (
          <div className="social-preview__desc">{displayDesc}</div>
        ) : null}
      </div>
      {showFooter ? (
        <div className="social-preview__image-url">
          {hasImageUrl ? (
            <>
              <span className="social-preview__image-url-label">{t('preview.imageUrl')}</span>
              <AnalyzeUrl url={image!} compact preferPage={false} />
              <button type="button" className="open-external-image__link" onClick={openImage}>
                {t('preview.openImage')}
              </button>
            </>
          ) : (
            <span className="social-preview__image-url-missing">{t('preview.imageNone')}</span>
          )}
        </div>
      ) : null}
    </div>
  );
});
