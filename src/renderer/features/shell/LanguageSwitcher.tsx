import { Locale, LOCALE_LABELS, type LocaleCode } from '../../../shared/const/locale.const';
import { useI18n } from '../../i18n/I18nProvider';
import flagRu from '../../assets/flags/ru.svg';
import flagEn from '../../assets/flags/en.svg';

const FLAGS: Record<LocaleCode, { src: string; code: string }> = {
  [Locale.Ru]: { src: flagRu, code: 'RU' },
  [Locale.En]: { src: flagEn, code: 'EN' },
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex gap-1" role="group" aria-label={t('lang.label')}>
      {([Locale.Ru, Locale.En] as LocaleCode[]).map((code) => {
        const active = locale === code;
        const meta = FLAGS[code];
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            title={LOCALE_LABELS[code]}
            onClick={() => setLocale(code)}
            className={`os-filter-chip flex items-center gap-1.5 font-medium${active ? ' is-active' : ''}`}
          >
            <img
              src={meta.src}
              alt=""
              width={18}
              height={12}
              className="h-3 w-[18px] shrink-0 border border-black/15 object-cover"
              aria-hidden
            />
            <span>{meta.code}</span>
          </button>
        );
      })}
    </div>
  );
}
