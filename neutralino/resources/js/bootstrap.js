/**
 * Neutralino bootstrap — init shell + Go extension (neutralino-ext-go).
 * Go engine is spawned by Neutralino via extensions[] in neutralino.config.json.
 */
(function bootstrapNeutralino() {
  if (typeof Neutralino === 'undefined') return;

  Neutralino.init();

  Neutralino.events.on('ready', () => {
    fetch('./.dev-inspector')
      .then(() => console.info('[OpenSpider dev] DevTools: F12 or Ctrl+Shift+I'))
      .catch(() => {});
  });

  Neutralino.events.on('exit', () => {
    /* Go extension terminates with Neutralino (neutralino-ext-go) */
  });
})();
