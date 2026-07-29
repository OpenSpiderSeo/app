// GoExtension — Neutralino ↔ Go bridge (neutralino-ext-go pattern).
// https://github.com/hschneider/neutralino-ext-go

class GoExtension {
  constructor(debug = false) {
    this.version = '1.0.0';
    this.debug = debug;

    if (typeof NL_MODE !== 'undefined' && NL_MODE !== 'window') {
      window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
        GO.stop();
        return '';
      });
    }
  }

  async run(f, p = null) {
    const ext = 'extGo';
    const event = 'runGo';
    const data = { function: f, parameter: p };

    if (this.debug) {
      console.log(`EXT_GO: Calling ${ext}.${event}: ` + JSON.stringify(data));
    }

    await Neutralino.extensions.dispatch(ext, event, data);
  }

  async stop() {
    const ext = 'extGo';
    const event = 'appClose';

    if (this.debug) {
      console.log(`EXT_GO: Calling ${ext}.${event}`);
    }
    await Neutralino.extensions.dispatch(ext, event, '');
    await Neutralino.app.exit();
  }
}

window.GoExtension = GoExtension;
