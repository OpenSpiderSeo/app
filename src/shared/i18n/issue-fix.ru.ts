/** Инструкции по исправлению для каждого IssueCode (RU). */
export const issueFixRu = {
  'issues.fix.title': 'Как исправить',
  'issues.fix.why': 'Почему важно',
  'issues.fix.how': 'Что сделать',
  'issues.fix.found': 'Что нашли',
  'issues.fix.method': 'Как нашли',
  'issues.fix.better': 'Как лучше сделать',
  'issues.fix.pick': 'Выберите строку — справа появится инструкция по этой проблеме.',
  'issues.fix.close': 'Закрыть',

  'fix.http.4xx.title': 'Ошибка HTTP 4xx',
  'fix.http.4xx.why':
    'Страница недоступна пользователям и поисковикам. Битые URL тратят crawl budget и портят UX.',
  'fix.http.4xx.how':
    '1) Откройте URL и проверьте код ответа.\n2) Если страница переехала — 301 на новый URL и обновите внутренние ссылки.\n3) Если удалена — 410 или уберите ссылки/записи из sitemap.\n4) Исправьте soft-404 (200 с текстом «не найдено»).',

  'fix.http.5xx.title': 'Ошибка HTTP 5xx',
  'fix.http.5xx.why':
    'Сбои сервера блокируют индексацию и конверсии; нестабильные URL могут временно «проседать».',
  'fix.http.5xx.how':
    '1) Смотрите логи сервера/приложения по URL.\n2) Устраните падения, таймауты, ошибки БД, неудачные деплои.\n3) После фикса — повторный краул.\n4) При перегрузке — кэш/мощность; не оставляйте долгий даунтайм.',

  'fix.http.redirect.title': 'HTTP-редирект',
  'fix.http.redirect.why':
    'Редирект нормален, если осознанный; цепочки и циклы жрут crawl budget и размывают сигналы.',
  'fix.http.redirect.how':
    '1) Один прыжок: A → финальный B (301 для постоянного переноса).\n2) Внутренние ссылки и sitemap — сразу на финал.\n3) Уберите цепочки A→B→C.\n4) 302 оставляйте только для временных изменений.',

  'fix.meta.title.missing.title': 'Нет title',
  'fix.meta.title.missing.why':
    'Без <title> сниппет в выдаче слабый, тематика страницы неочевидна.',
  'fix.meta.title.missing.how':
    '1) Добавьте уникальный <title> в шаблон/CMS.\n2) Основной ключ — ближе к началу.\n3) Ориентир ~30–60 символов; бренд — если влезает.\n4) Перекраульте и проверьте title в таблице.',

  'fix.meta.title.duplicate.title': 'Дубликат title',
  'fix.meta.title.duplicate.why':
    'Одинаковые title заставляют страницы конкурировать друг с другом и ухудшают CTR.',
  'fix.meta.title.duplicate.how':
    '1) Найдите все URL с одним title.\n2) Напишите уникальный title под интент каждой страницы.\n3) Исправьте шаблон, который копирует один title на весь сайт.\n4) Близкие страницы — объедините или дифференцируйте.',

  'fix.meta.title.short.title': 'Title слишком короткий',
  'fix.meta.title.short.why':
    'Короткий title плохо использует строку в SERP и часто не отражает запрос.',
  'fix.meta.title.short.how':
    '1) Расширьте примерно до 30–60 символов.\n2) Добавьте тему/модификатор (город, год, тип товара).\n3) Без переспама.\n4) Перекраульте длину.',

  'fix.meta.title.long.title': 'Title слишком длинный',
  'fix.meta.title.long.why':
    'Длинный title обрезается в выдаче — важные слова могут пропасть.',
  'fix.meta.title.long.how':
    '1) Сократите к ~60 символам (ширина в пикселях зависит от букв).\n2) Уникальную ценность — в начало.\n3) Второстепенное — в description или H1.\n4) Перекраульте.',

  'fix.meta.description.missing.title': 'Нет meta description',
  'fix.meta.description.missing.why':
    'Без описания поисковик соберёт сниппет сам — часто хуже для CTR.',
  'fix.meta.description.missing.how':
    '1) Добавьте уникальный description (~70–160 символов).\n2) Польза страницы + мягкий CTA.\n3) Упоминание запроса помогает CTR, не «вес» напрямую.\n4) Перекраульте.',

  'fix.meta.description.duplicate.title': 'Дубликат meta description',
  'fix.meta.description.duplicate.why':
    'Одинаковые сниппеты не отличают страницы и выглядят шаблонно.',
  'fix.meta.description.duplicate.how':
    '1) Найдите группу URL с одним description.\n2) Перепишите под интент каждой страницы.\n3) Уберите дефолт CMS, копирующий один текст везде.',

  'fix.meta.description.short.title': 'Description слишком короткий',
  'fix.meta.description.short.why':
    'Короткий description не использует место в выдаче и слабо убеждает кликнуть.',
  'fix.meta.description.short.how':
    '1) Расширьте до ~70–160 символов.\n2) Кому и что даёт страница.\n3) Без воды; один понятный CTA.',

  'fix.meta.description.long.title': 'Description слишком длинный',
  'fix.meta.description.long.why':
    'Длинный текст обрежется; CTA может не попасть в сниппет.',
  'fix.meta.description.long.how':
    '1) Уложите в ~160 символов.\n2) Главную выгоду — в начало.\n3) Перекраульте и оцените сниппет.',

  'fix.meta.description.og_only.title': 'Только og:description (нет meta description)',
  'fix.meta.description.og_only.why':
    'Google в первую очередь берёт meta name="description" для сниппета; одного og:description может быть недостаточно.',
  'fix.meta.description.og_only.how':
    '1) Добавьте отдельный <meta name="description" content="…">.\n2) og:description держите согласованным, но не полагайтесь только на него.\n3) Перекраульте metaDescriptionOnly.',

  'fix.meta.title.h1_duplicate.title': 'Title совпадает с H1',
  'fix.meta.title.h1_duplicate.why':
    'Одинаковые title и H1 не используют второй шанс усилить тему и ключевые слова.',
  'fix.meta.title.h1_duplicate.how':
    '1) Title — под SERP (бренд/модификатор).\n2) H1 — для пользователя, чуть шире или разговорнее.\n3) Совпадение по интенту, не дословное копирование.',

  'fix.meta.title.desc_duplicate.title': 'Title совпадает с meta description',
  'fix.meta.title.desc_duplicate.why':
    'Повтор одного текста в title и description выглядит лениво и недоиспользует место в выдаче.',
  'fix.meta.title.desc_duplicate.how':
    '1) Title = тема + крючок.\n2) Description = выгода, доказательство, мягкий CTA.\n3) Не дублируйте одну и ту же фразу.',

  'fix.heading.h1.missing.title': 'Нет H1',
  'fix.heading.h1.missing.why':
    'H1 — главный заголовок темы для пользователя и парсеров.',
  'fix.heading.h1.missing.how':
    '1) Добавьте один понятный <h1> по теме страницы.\n2) Согласуйте интент с title (текст может отличаться).\n3) H1 должен быть в основном контенте (не только в JS, который бот не видит).',

  'fix.heading.h1.multiple.title': 'Несколько H1',
  'fix.heading.h1.multiple.why':
    'Несколько H1 размывают иерархию и тему страницы.',
  'fix.heading.h1.multiple.how':
    '1) Оставьте один H1.\n2) Остальные понизьте до H2/H3.\n3) Проверьте блоки темы/конструктора, которые вставляют лишние H1.',

  'fix.heading.h2.missing.title': 'Нет H2',
  'fix.heading.h2.missing.why':
    'Длинная страница без подзаголовков хуже сканируется и слабее передаёт структуру темы.',
  'fix.heading.h2.missing.how':
    '1) Разбейте контент на секции с H2.\n2) H2 — под темы, по которым ищут.\n3) Один H1; H2 для крупных блоков, H3 для подпунктов.\n4) Перекраульте h2Count на объёмных URL.',

  'fix.canonical.missing.title': 'Нет canonical',
  'fix.canonical.missing.why':
    'Без canonical дубли (параметры, слэш, HTTP/HTTPS) могут конкурировать.',
  'fix.canonical.missing.how':
    '1) Добавьте <link rel="canonical" href="…"> на предпочитаемый URL.\n2) Для уникальных страниц — self-canonical.\n3) Sitemap и внутренние ссылки — на каноникал.\n4) Перекраульте.',

  'fix.canonical.off_origin.title': 'Canonical на другой домен',
  'fix.canonical.off_origin.why':
    'Кросс-доменный canonical может отдать индексацию чужому сайту — часто ошибка.',
  'fix.canonical.off_origin.how':
    '1) Убедитесь, что это задумано (синдикация).\n2) Если нет — поставьте canonical на свой URL.\n3) Проверьте шаблоны CDN/staging с чужим canonical.',

  'fix.canonical.self_mismatch.title': 'Canonical указывает на другой URL сайта',
  'fix.canonical.self_mismatch.why':
    'Если URL страницы ≠ canonical, эта страница считается дублем — сигналы индексации идут на canonical.',
  'fix.canonical.self_mismatch.how':
    '1) Убедитесь, что canonical — тот URL, который нужно индексировать.\n2) Если индексируем этот URL — self-canonical или уберите тег.\n3) Согласуйте внутренние ссылки и sitemap.\n4) Перекраульте.',

  'fix.canonical.noindex_mismatch.title': 'noindex с canonical на другой URL',
  'fix.canonical.noindex_mismatch.why':
    'noindex + canonical на другой адрес даёт противоречивые сигналы индексации.',
  'fix.canonical.noindex_mismatch.how':
    '1) Решите, какой URL должен индексироваться — часто снимают noindex с канонической цели.\n2) Если этот URL должен остаться noindex — self-canonical или уберите canonical.\n3) Внутренние ссылки — на индексируемый URL.\n4) Перекраульте robots + canonical вместе.',

  'fix.robots.noindex.title': 'Обнаружен noindex',
  'fix.robots.noindex.why':
    'noindex запрещает индексацию. Критично, если стоит на денежных страницах по ошибке.',
  'fix.robots.noindex.how':
    '1) Проверьте meta robots и X-Robots-Tag.\n2) Снимите noindex со страниц, которые должны ранжироваться.\n3) Оставляйте noindex на thank-you, фильтрах, корзине, staging — осознанно.\n4) Перекраульте; позже сверьте в GSC/Вебмастере.',

  'fix.robots.conflict.title': 'Конфликт robots (index + noindex)',
  'fix.robots.conflict.why':
    'index и noindex в одном meta robots неоднозначны — краулер может вести себя непредсказуемо.',
  'fix.robots.conflict.how':
    '1) Найдите meta name="robots" в исходнике.\n2) Оставьте одну директиву (index,follow или noindex,follow).\n3) Уберите дубли/conflict от плагинов CMS.\n4) Перекраульте robotsMeta.',

  'fix.robots.nofollow.title': 'nofollow в robots meta',
  'fix.robots.nofollow.why':
    'Page-level nofollow запрещает поисковикам переходить по исходящим ссылкам — редко нужно на коммерческих/контентных страницах.',
  'fix.robots.nofollow.how':
    '1) Подтвердите, что nofollow задуман (спонсорские хабы, UGC).\n2) Уберите nofollow со страниц, которые должны передавать внутренний вес.\n3) Лучше rel="nofollow" на отдельных ссылках, а не на всей странице.\n4) Перекраульте robotsMeta.',

  'fix.content.thin.title': 'Тонкий контент',
  'fix.content.thin.why':
    'Мало текста редко закрывает интент и слабо ранжируется в конкуренции.',
  'fix.content.thin.how':
    '1) Добавьте полезный контент (ответы, характеристики, FAQ) — не воду.\n2) Тонкие URL объедините в сильную страницу с 301.\n3) На листингах — уникальный вводный текст.\n4) Перекраульте word count.',

  'fix.content.no_images.title': 'Длинный текст без изображений',
  'fix.content.no_images.why':
    'Визуальные блоки улучшают вовлечение; для image search и rich results часто нужно хотя бы одно релевантное изображение.',
  'fix.content.no_images.how':
    '1) Добавьте информативное изображение (схема, фото, скрин).\n2) Пропишите alt.\n3) Сожмите для скорости.\n4) Перекраульте imagesTotal на длинных URL.',

  'fix.content.spell_heuristic.title': 'Полировка текста',
  'fix.content.spell_heuristic.why':
    'Повторы слов, КАПС и лишняя пунктуация бьют по читаемости и доверию.',
  'fix.content.spell_heuristic.how':
    '1) Уберите случайные повторы.\n2) Не пишите длинные слова КАПСОМ.\n3) Уберите !!! / ???.\n4) Вычитайте и перекраульте.',

  'fix.content.near_duplicate.title': 'Почти-дубликат контента',
  'fix.content.near_duplicate.why':
    'Похожие страницы делят сигналы и засоряют индекс.',
  'fix.content.near_duplicate.how':
    '1) Сравните пару URL.\n2) Оставьте одну главную; остальные — 301 или noindex.\n3) Оставшиеся страницы дифференцируйте.\n4) Исправьте шаблоны с одним и тем же телом.',

  'fix.social.og_title.missing.title': 'Нет og:title',
  'fix.social.og_title.missing.why':
    'В соцсетях превью берёт слабый fallback — меньше кликов.',
  'fix.social.og_title.missing.how':
    '1) Добавьте og:title (и желательно twitter:title).\n2) Текст шаринга = оффер страницы.\n3) Проверьте отладчиком соцсети после деплоя.',

  'fix.social.og_image.missing.title': 'Нет og:image',
  'fix.social.og_image.missing.why':
    'Без картинки превью ссылки пустое — хуже CTR в соцсетях.',
  'fix.social.og_image.missing.how':
    '1) Добавьте og:image с абсолютным HTTPS URL (≥1200×630).\n2) Сожмите без потери читаемости.\n3) Картинка должна быть доступна ботам (не закрыта robots).',

  'fix.social.twitter_card.missing.title': 'Нет twitter:card и og:title',
  'fix.social.twitter_card.missing.why':
    'Без twitter:card и og:title превью в Twitter/X — голый URL, слабый CTR.',
  'fix.social.twitter_card.missing.how':
    '1) Добавьте meta name="twitter:card" (summary или summary_large_image).\n2) Добавьте og:title.\n3) Для large image — og:image.\n4) Проверьте в Twitter Card Validator после деплоя.',

  'fix.schema.jsonld.missing.title': 'Нет JSON-LD',
  'fix.schema.jsonld.missing.why':
    'Разметка даёт шанс на расширенные сниппеты (FAQ, Product, Article…).',
  'fix.schema.jsonld.missing.how':
    '1) Добавьте релевантный JSON-LD (schema.org) под тип страницы.\n2) Проверьте Rich Results Test.\n3) Только правдивые данные — без фейковых отзывов/цен.\n4) Перекраульте jsonLdCount.',

  'fix.schema.jsonld.invalid.title': 'Битый JSON-LD',
  'fix.schema.jsonld.invalid.why':
    'Невалидный JSON-LD поисковики игнорируют — rich results не появятся, а в GSC ошибка неочевидна.',
  'fix.schema.jsonld.invalid.how':
    '1) Найдите блоки application/ld+json в исходнике.\n2) Исправьте JSON (запятые, кавычки, мусор после объекта).\n3) Проверьте типы/свойства в Rich Results Test.\n4) Перекраульте до исчезновения issue.',

  'fix.schema.jsonld.weak.title': 'Слабый JSON-LD (нет @type)',
  'fix.schema.jsonld.weak.why':
    'JSON-LD без @type почти бесполезен для rich results.',
  'fix.schema.jsonld.weak.how':
    '1) Добавьте @type под страницу (WebPage, Article, Product…).\n2) Укажите обязательные свойства типа.\n3) Проверьте Rich Results Test.\n4) Перекраульте jsonLdTypes.',

  'fix.a11y.img.alt_missing.title': 'У изображений нет alt',
  'fix.a11y.img.alt_missing.why':
    'Пустой alt бьёт по доступности и контексту в image search.',
  'fix.a11y.img.alt_missing.how':
    '1) Информативным картинкам — осмысленный alt.\n2) Декору — alt="".\n3) Не пихайте ключи в каждый alt.\n4) Перекраульте imagesMissingAlt.',

  'fix.a11y.img.all_alt_missing.title': 'У всех изображений нет alt',
  'fix.a11y.img.all_alt_missing.why':
    'Ни у одного <img> нет alt — теряются доступность и контекст для image SEO на всей странице.',
  'fix.a11y.img.all_alt_missing.how':
    '1) Проверьте каждый <img>.\n2) Добавьте осмысленный alt или alt="" для декора.\n3) Исправьте CMS, если alt срезается.\n4) Перекраульте до imagesMissingAlt = 0.',

  'fix.a11y.html.lang_missing.title': 'Нет html lang',
  'fix.a11y.html.lang_missing.why':
    'Скринридеры и поиск используют html[lang] для языка озвучки и релевантности.',
  'fix.a11y.html.lang_missing.how':
    '1) Укажите <html lang="ru"> (или нужную локаль).\n2) Язык должен совпадать с контентом.\n3) Перекраульте htmlLang.',

  'fix.a11y.button.name_missing.title': 'Кнопки без имени',
  'fix.a11y.button.name_missing.why':
    'Пустые/иконочные кнопки недоступны для AT и падают на базовых проверках WCAG.',
  'fix.a11y.button.name_missing.how':
    '1) Добавьте текст, aria-label или aria-labelledby.\n2) Предпочитайте <button>, а не div с кликом.\n3) Перекраульте buttonsWithoutName.',

  'fix.a11y.skip.missing.title': 'Нет skip-ссылки',
  'fix.a11y.skip.missing.why':
    'Skip-link помогает пользователям клавиатуры пропустить навигацию — базовое требование доступности.',
  'fix.a11y.skip.missing.how':
    '1) Добавьте ранний <a href="#main">Перейти к содержимому</a>.\n2) Убедитесь, что id цели существует и фокусируем.\n3) Показывайте ссылку при фокусе с клавиатуры.\n4) Перекраульте hasSkipLink.',

  'fix.a11y.link.name_missing.title': 'Ссылки без доступного имени',
  'fix.a11y.link.name_missing.why':
    'Пустые/иконочные ссылки недоступны для AT и падают на WCAG link-purpose.',
  'fix.a11y.link.name_missing.how':
    '1) Добавьте видимый текст или aria-label.\n2) Для иконок опишите действие/назначение.\n3) Не используйте картинки без alt внутри ссылок.\n4) Перекраульте linksWithoutAccessibleName.',

  'fix.local.nap.incomplete.title': 'Неполный NAP в JSON-LD',
  'fix.local.nap.incomplete.why':
    'LocalBusiness/Organization без телефона и адреса слабее для локальной выдачи, карт и knowledge panel. Поисковики сверяют NAP с профилем в Google Business / Яндекс Бизнес.',
  'fix.local.nap.incomplete.method':
    'OpenSpider парсит все <script type="application/ld+json">, ищет типы LocalBusiness, Organization и *Business/*Organization и проверяет наличие telephone (или phone) и address (строка или PostalAddress). Если хотя бы одно поле отсутствует — issue.',
  'fix.local.nap.incomplete.better': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Кафе Пример",
  "telephone": "+7-495-123-45-67",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ул. Примерная, 1",
    "addressLocality": "Москва",
    "postalCode": "101000",
    "addressCountry": "RU"
  }
}
</script>`,
  'fix.local.nap.incomplete.how':
    '1) Добавьте telephone и PostalAddress в JSON-LD на этой странице.\n2) Сверьте NAP с Google Business / Яндекс Бизнес — формат и написание должны совпадать.\n3) Используйте один NAP на всём сайте (футер, контакты, schema).\n4) Проверьте в Rich Results Test и перекраулите.',

  'fix.mobile.viewport.missing.title': 'Нет meta viewport',
  'fix.mobile.viewport.missing.why':
    'Без viewport мобильный браузер рисует desktop-вёрстку — хуже UX и сигналы mobile SEO.',
  'fix.mobile.viewport.missing.how':
    '1) Добавьте <meta name="viewport" content="width=device-width, initial-scale=1">.\n2) Проверьте адаптивный CSS.\n3) Перекраульте hasViewport.',

  'fix.content.exact_duplicate.title': 'Точный дубликат контента',
  'fix.content.exact_duplicate.why':
    'Одинаковый body на разных URL тратит crawl budget и дробит вес.',
  'fix.content.exact_duplicate.how':
    '1) Каноникал на главный URL (301 или rel=canonical).\n2) Или осмысленно разведите контент.\n3) Уберите мягкие дубли из внутренних ссылок/sitemap.\n4) Перекраульте exact duplicates.',

  'fix.links.orphan.title': 'Страница-сирота',
  'fix.links.orphan.why':
    'Без внутренних входящих ссылок страницу трудно найти, она почти не получает вес.',
  'fix.links.orphan.method':
    'При обходе OpenSpider считает inlinks — сколько других страниц сайта ссылаются на URL. Страницы с HTTP 200, depth > 0 и inlinks = 0 помечаются как сироты (стартовый URL исключён).',
  'fix.links.orphan.how':
    '1) Добавьте внутренние ссылки с релевантных страниц.\n2) Важные сироты — в навигацию/хабы/sitemap.\n3) Устаревшее — noindex или 301.\n4) Перекраульте inlinks.',

  'fix.links.deep.title': 'Глубокая страница',
  'fix.links.deep.why':
    'Слишком глубокие URL реже краулятся и слабее получают внутренний вес.',
  'fix.links.deep.how':
    '1) Сократите путь: ссылки с верхних хабов.\n2) Хлебные крошки и блоки «похожие».\n3) Важные deep URL — в категории/меню.\n4) Перекраульте depth.',

  'fix.intl.hreflang.missing.title': 'Нет hreflang',
  'fix.intl.hreflang.missing.why':
    'На мультиязычном сайте без hreflang путается локаль и плодятся дубли.',
  'fix.intl.hreflang.missing.how':
    '1) Взаимные hreflang для каждой языковой/региональной версии.\n2) При необходимости — x-default.\n3) Абсолютные URL и self-reference.\n4) Перекраульте после деплоя.',

  'fix.intl.hreflang.not_reciprocal.title': 'Hreflang не взаимный',
  'fix.intl.hreflang.not_reciprocal.why':
    'Односторонний hreflang ломает языковые кластеры — Google может игнорировать разметку.',
  'fix.intl.hreflang.not_reciprocal.how':
    '1) Для каждой связи A→B добавьте B→A с корректными locale-кодами.\n2) Self-reference на каждой версии.\n3) Абсолютные URL, согласованные с canonical.\n4) Полный перекраул для проверки пар среди найденных URL.',

  'fix.geo.llms_txt.missing.title': 'Нет /llms.txt',
  'fix.geo.llms_txt.missing.why':
    'llms.txt подсказывает AI/поисковым ботам, какой контент использовать (практика GEO).',
  'fix.geo.llms_txt.missing.how':
    '1) Опубликуйте https://ваш-домен/llms.txt со списком ключевых материалов.\n2) Держите файл актуальным и честным.\n3) Дополнительно — sitemap в robots.txt.\n4) Повторите probe в Labs.',

  'fix.http.soft_404.title': 'Soft-404 (200 «не найдено»)',
  'fix.http.soft_404.why':
    'HTTP 200 для отсутствующих страниц тратит crawl budget и портит качество индекса.',
  'fix.http.soft_404.how':
    '1) Решите: 404/410 или редирект на замену.\n2) Отдайте реальный статус 404/410 (или 301).\n3) Уберите внутренние ссылки и записи из sitemap.\n4) Перекраульте и проверьте коды ответа.',

  'fix.content.citability.weak.title': 'Слабые сигналы цитируемости',
  'fix.content.citability.weak.why':
    'Длинные страницы без структуры/схемы сложнее уверенно цитировать поиском и AI.',
  'fix.content.citability.weak.how':
    '1) Добавьте ясные H2 под отдельные вопросы.\n2) JSON-LD (Article/FAQ/HowTo по смыслу).\n3) Короткий ответ в начале.\n4) Title/H1 = основной интент.',

  'fix.links.outbound.broken.title': 'Битая исходящая ссылка',
  'fix.links.outbound.broken.why':
    'Мёртвые внешние ссылки портят UX и доверие; для поиска это сигнал качества.',
  'fix.links.outbound.broken.how':
    '1) Откройте целевой URL и подтвердите статус.\n2) Обновите или удалите ссылку на каждой странице-источнике.\n3) Ссылайтесь на стабильные HTTPS-адреса.\n4) После правок снова запустите проверку исходящих в Labs.',
} as const;
