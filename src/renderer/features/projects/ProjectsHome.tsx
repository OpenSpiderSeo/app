import { useState, type FormEvent } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { parseKeywordInput } from '../../../shared/utils/project-keywords.utils';
import { healthBandFromScore } from '../../../shared/utils/honor-rank.utils';
import { EchoAtmosphere } from '../../components/EchoAtmosphere';
import { EmptyStateArt } from '../../assets/brand/EmptyStateArt';
import { SpiderMark } from '../../assets/brand/SpiderMark';
import { useProject } from './ProjectProvider';

function formatDate(iso: string | null | undefined, empty: string): string {
  if (!iso) return empty;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return empty;
  }
}

export function ProjectsHome() {
  const { t } = useI18n();
  const { projects, createProject, selectProject, deleteProject } = useProject();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [keyword, setKeyword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(projects.length === 0);

  const onOpenProject = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await selectProject(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projects.openError'));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!name.trim() || !trimmed || trimmed === 'https://') {
      setError(t('projects.formError'));
      return;
    }
    setBusy(true);
    try {
      const project = await createProject({
        name: name.trim(),
        startUrl: trimmed,
        keywords: parseKeywordInput(keyword),
      });
      await selectProject(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projects.openError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="projects-home">
      <EchoAtmosphere dense />

      <header className="projects-home__hero">
        <div className="projects-home__hero-art" aria-hidden>
          <EmptyStateArt kind="pulse" size={180} />
        </div>
        <p className="projects-home__brand">
          <SpiderMark size={32} />
          OpenSpider
        </p>
        <span className="os-eyebrow">{t('projects.eyebrow')}</span>
        <h1 className="projects-home__title">{t('projects.title')}</h1>
        <p className="projects-home__sub">{t('projects.subtitle')}</p>
      </header>

      <div className="projects-home__actions">
        <button
          type="button"
          className="os-btn os-btn--primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {t('projects.create')}
        </button>
      </div>

      {showForm ? (
        <form className="projects-home__form os-surface" onSubmit={onCreate}>
          <h2 className="projects-home__form-title">{t('projects.formTitle')}</h2>
          <TextField className="mb-3" name="name">
            <Label>{t('projects.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Example Site" />
          </TextField>
          <TextField className="mb-3" name="url">
            <Label>{t('projects.url')}</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </TextField>
          <TextField className="mb-3" name="keyword">
            <Label>{t('projects.keyword')}</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('projects.keywordHint')}
            />
          </TextField>
          <p className="mb-3 text-xs text-[var(--os-muted)]">{t('projects.keywordMulti')}</p>
          {error ? <p className="projects-home__error">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" isDisabled={busy}>
              {t('projects.create')}
            </Button>
          </div>
        </form>
      ) : null}

      {projects.length === 0 && !showForm ? (
        <div className="os-empty-state projects-home__empty">
          <EmptyStateArt kind="scroll" size={140} className="os-empty-state__art" />
          <p className="os-empty-state__text">{t('projects.empty')}</p>
        </div>
      ) : (
        <>
          {error && !showForm ? <p className="projects-home__error">{error}</p> : null}
          <ul className="projects-home__grid">
          {projects.map((p, i) => {
            const band = healthBandFromScore(p.lastHealthScore);
            return (
              <li
                key={p.id}
                className="project-tile"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <button
                  type="button"
                  className="project-tile__body"
                  onClick={() => void onOpenProject(p.id)}
                >
                  <span className="project-tile__domain">{p.domain}</span>
                  <span className="project-tile__name">{p.name}</span>
                  <span className="project-tile__meta">
                    {p.lastHealthScore != null ? (
                      <span
                        className={`project-tile__score${band ? ` project-tile__score--${band}` : ''}`}
                      >
                        {p.lastHealthScore}
                      </span>
                    ) : null}
                    {band ? (
                      <span className={`project-tile__health project-tile__health--${band}`}>
                        {t(`health.${band}` as MessageKey)}
                      </span>
                    ) : null}
                    <span>
                      {p.lastCheckedAt
                        ? `${t('projects.lastCheck')}: ${formatDate(p.lastCheckedAt, '—')}`
                        : t('projects.noChecks')}
                    </span>
                  </span>
                </button>
                <div className="project-tile__footer">
                  <button
                    type="button"
                    className="os-btn os-btn--ghost"
                    onClick={() => void onOpenProject(p.id)}
                  >
                    {t('projects.open')}
                  </button>
                  <button
                    type="button"
                    className="os-btn os-btn--danger-ghost"
                    onClick={() => {
                      if (window.confirm(t('projects.deleteConfirm'))) {
                        void deleteProject(p.id);
                      }
                    }}
                  >
                    {t('projects.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}
