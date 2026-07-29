import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

const GUIDE_SECTION_IDS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  's10',
  's11',
] as const;

export const GuidePanel = memo(function GuidePanel() {
  const { t } = useI18n();

  const sections = GUIDE_SECTION_IDS.map((id) => ({
    id,
    title: t(`guide.${id}.title`),
    body: t(`guide.${id}.body`),
  }));

  return (
    <section className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-auto">
      <header className="hub-panel__lead-block">
        <p className="hub-panel__lead">{t('guide.subtitle')}</p>
        <p className="mt-3 text-sm leading-relaxed">{t('guide.intro')}</p>
      </header>

      <nav className="admin-panel p-3" aria-label={t('guide.toc')}>
        <p className="admin-label">{t('guide.toc')}</p>
        <ol className="mt-2 flex flex-col gap-1 text-sm">
          {sections.map((s, idx) => (
            <li key={s.id}>
              <a
                href={`#guide-${s.id}`}
                className="text-[var(--os-accent)] hover:underline"
              >
                {idx + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-3 pb-8">
        {sections.map((s, idx) => (
          <article key={s.id} id={`guide-${s.id}`} className="admin-panel scroll-mt-4 p-4">
            <h2 className="font-display text-base font-semibold">
              <span className="font-mono text-[var(--os-faint)]">{idx + 1}.</span> {s.title}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--os-muted)]">
              {s.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
});
