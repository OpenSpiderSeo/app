import { memo, useEffect, useState, type MouseEvent } from 'react';
import type { PreviewImageLoadMode } from '../../shared/utils/preview-image.utils';
import { previewImageSrc } from '../../shared/utils/preview-image.utils';
import { useI18n } from '../i18n/I18nProvider';
import { openInBrowser } from '../lib/open-external';

interface OpenExternalImageProps {
  url: string;
  alt?: string;
  className?: string;
  thumbClassName?: string;
  showOpenButton?: boolean;
}

export const OpenExternalImage = memo(function OpenExternalImage({
  url,
  alt = '',
  className = '',
  thumbClassName = 'preview-image-meta__thumb',
  showOpenButton = true,
}: OpenExternalImageProps) {
  const { t } = useI18n();
  const trimmed = url.trim();
  const [imgMode, setImgMode] = useState<PreviewImageLoadMode | 'failed'>('direct');

  useEffect(() => {
    setImgMode('direct');
  }, [trimmed]);

  if (!trimmed) return null;

  const imgSrc = imgMode !== 'failed' ? previewImageSrc(trimmed, imgMode) : null;

  const open = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void openInBrowser(trimmed);
  };

  return (
    <span className={`open-external-image ${className}`.trim()}>
      <button
        type="button"
        className="open-external-image__btn"
        title={t('preview.openImage')}
        aria-label={t('preview.openImage')}
        onClick={open}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={alt}
            className={thumbClassName}
            referrerPolicy="no-referrer"
            onError={() => {
              setImgMode((mode) => (mode === 'direct' ? 'proxy' : 'failed'));
            }}
          />
        ) : (
          <span className={`${thumbClassName} open-external-image__thumb--broken`} aria-hidden />
        )}
      </button>
      {showOpenButton ? (
        <button type="button" className="open-external-image__link" onClick={open}>
          {t('preview.openImage')}
        </button>
      ) : null}
    </span>
  );
});
