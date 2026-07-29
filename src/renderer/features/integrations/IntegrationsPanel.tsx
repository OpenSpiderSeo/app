import { memo, useEffect, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import type { IntegrationSecrets } from '../../../shared/types/ipc.types';
import type { CsvImportType } from '../../../shared/types/audit.types';
import { useIntegrationsQuery } from '../crawl/use-crawl-queries';

export const IntegrationsPanel = memo(function IntegrationsPanel() {
  const { t } = useI18n();
  const { data: items = [], refetch } = useIntegrationsQuery();
  const [secrets, setSecrets] = useState<IntegrationSecrets>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [psiUrl, setPsiUrl] = useState('https://example.com/');

  useEffect(() => {
    void window.openspider.getSecrets().then(setSecrets);
  }, []);

  const save = async (patch: IntegrationSecrets) => {
    setBusy(true);
    const next = await window.openspider.saveSecrets(patch);
    setSecrets(next);
    setBusy(false);
    setMsg(t('integrations.saved'));
    void refetch();
  };

  const testPsi = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await window.openspider.runPagespeed(psiUrl);
      setMsg(
        result.error
          ? result.error
          : t('integrations.psi.ok', {
              perf: String(result.performance ?? '—'),
              seo: String(result.seo ?? '—'),
            }),
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const testMetrika = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await window.openspider.fetchMetrika();
      setMsg(
        result.error
          ? result.error
          : t('integrations.metrika.ok', { visits: String(result.visits) }),
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (type: CsvImportType) => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await window.openspider.importCsvDialog(type);
      if (!result.ok) {
        if (result.error !== 'Cancelled') setMsg(result.error);
        return;
      }
      setMsg(t('integrations.csv.imported', { count: String(result.count), type }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex h-full flex-col gap-4 overflow-auto">
      <p className="hub-panel__lead max-w-2xl">{t('integrations.subtitle')}</p>

      <article className="admin-panel p-4">
        <h2 className="font-display text-base font-semibold">{t('integrations.psi.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('integrations.psi.body')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextField
            value={secrets.psiApiKey ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, psiApiKey: v }))}
          >
            <Label>{t('integrations.psi.key')}</Label>
            <Input type="password" />
          </TextField>
          <TextField value={psiUrl} onChange={setPsiUrl}>
            <Label>{t('integrations.psi.testUrl')}</Label>
            <Input />
          </TextField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            isDisabled={busy}
            onPress={() => void save({ psiApiKey: secrets.psiApiKey })}
          >
            {t('integrations.save')}
          </Button>
          <Button variant="secondary" isDisabled={busy} onPress={() => void testPsi()}>
            {t('integrations.psi.test')}
          </Button>
        </div>
      </article>

      <article className="admin-panel p-4">
        <h2 className="font-display text-base font-semibold">{t('integrations.openai.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('integrations.openai.body')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextField
            value={secrets.openaiApiKey ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, openaiApiKey: v }))}
          >
            <Label>{t('integrations.openai.key')}</Label>
            <Input type="password" />
          </TextField>
          <TextField
            value={secrets.openaiBaseUrl ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, openaiBaseUrl: v }))}
          >
            <Label>{t('integrations.openai.baseUrl')}</Label>
            <Input placeholder="https://api.openai.com/v1" />
          </TextField>
        </div>
        <Button
          className="mt-3"
          variant="primary"
          isDisabled={busy}
          onPress={() =>
            void save({
              openaiApiKey: secrets.openaiApiKey,
              openaiBaseUrl: secrets.openaiBaseUrl,
            })
          }
        >
          {t('integrations.save')}
        </Button>
      </article>

      <article className="admin-panel p-4">
        <h2 className="font-display text-base font-semibold">{t('integrations.metrika.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('integrations.metrika.body')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextField
            value={secrets.metrikaCounterId ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, metrikaCounterId: v }))}
          >
            <Label>{t('integrations.metrika.counter')}</Label>
            <Input />
          </TextField>
          <TextField
            value={secrets.metrikaOauthToken ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, metrikaOauthToken: v }))}
          >
            <Label>{t('integrations.metrika.token')}</Label>
            <Input type="password" />
          </TextField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            isDisabled={busy}
            onPress={() =>
              void save({
                metrikaCounterId: secrets.metrikaCounterId,
                metrikaOauthToken: secrets.metrikaOauthToken,
              })
            }
          >
            {t('integrations.save')}
          </Button>
          <Button variant="secondary" isDisabled={busy} onPress={() => void testMetrika()}>
            {t('integrations.metrika.test')}
          </Button>
        </div>
      </article>

      <article className="admin-panel p-4">
        <h2 className="font-display text-base font-semibold">{t('integrations.indexnow.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('integrations.indexnow.body')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextField
            value={secrets.indexNowKey ?? ''}
            onChange={(v) => setSecrets((s) => ({ ...s, indexNowKey: v }))}
          >
            <Label>{t('integrations.indexnow.key')}</Label>
            <Input />
          </TextField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            isDisabled={busy}
            onPress={() => void save({ indexNowKey: secrets.indexNowKey })}
          >
            {t('integrations.save')}
          </Button>
          <Button
            variant="secondary"
            isDisabled={busy}
            onPress={async () => {
              setBusy(true);
              setMsg(null);
              try {
                const result = await window.openspider.downloadIndexNowKey(
                  secrets.indexNowKey?.trim() || undefined,
                );
                if (result.ok) {
                  setSecrets((s) => ({ ...s, indexNowKey: result.key }));
                  setMsg(
                    t('integrations.indexnow.downloaded', {
                      path: result.path,
                      hint: result.hint,
                    }),
                  );
                }
              } catch (err) {
                setMsg(err instanceof Error ? err.message : String(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('integrations.indexnow.download')}
          </Button>
        </div>
      </article>

      <article className="admin-panel p-4">
        <h2 className="font-display text-base font-semibold">{t('integrations.csv.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('integrations.csv.body')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" isDisabled={busy} onPress={() => void importCsv('gsc')}>
            {t('integrations.csv.gsc')}
          </Button>
          <Button variant="secondary" isDisabled={busy} onPress={() => void importCsv('webmaster')}>
            {t('integrations.csv.webmaster')}
          </Button>
          <Button variant="secondary" isDisabled={busy} onPress={() => void importCsv('ga4')}>
            {t('integrations.csv.ga4')}
          </Button>
          <Button variant="secondary" isDisabled={busy} onPress={() => void importCsv('backlinks')}>
            {t('integrations.csv.backlinks')}
          </Button>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const statusKey = `integrations.status.${item.status}` as MessageKey;
          return (
            <article key={item.id} className="admin-panel flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-medium">{item.name}</h3>
                <span className="os-badge font-mono uppercase">
                  {t(statusKey)}
                </span>
              </div>
              <p className="flex-1 text-sm text-[var(--os-muted)]">
                {t(`integrations.${item.id}.desc` as MessageKey)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onPress={() => {
                    window.open(item.docsUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  {t('integrations.docs')}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {msg ? <p className="text-sm text-[var(--os-muted)]">{msg}</p> : null}
    </section>
  );
});
