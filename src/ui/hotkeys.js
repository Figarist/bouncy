export class HotkeyManager {
  constructor(handlers) {
    this.handlers = handlers; // { onSpace, onM, onC, onF, onMode1, onMode2, onMode3, onT, onS, onH, onHelp }
    this.boundListener = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.boundListener);
  }

  onKeyDown(e) {
    // Ignore hotkeys when typing in input fields
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.handlers.onSpace?.();
        break;
      case 'KeyM':
        e.preventDefault();
        this.handlers.onM?.();
        break;
      case 'KeyC':
        e.preventDefault();
        this.handlers.onC?.();
        break;
      case 'KeyF':
        e.preventDefault();
        this.handlers.onF?.();
        break;
      case 'Digit1':
        this.handlers.onMode1?.();
        break;
      case 'Digit2':
        this.handlers.onMode2?.();
        break;
      case 'Digit3':
        this.handlers.onMode3?.();
        break;
      case 'KeyT':
        this.handlers.onT?.();
        break;
      case 'KeyS':
        this.handlers.onS?.();
        break;
      case 'KeyH':
        this.handlers.onH?.();
        break;
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.boundListener);
  }
}
