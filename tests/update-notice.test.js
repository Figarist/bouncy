import { describe, expect, it } from 'vitest';
import { isCurrentBuild } from '../src/ui/update-notice.js';

describe('isCurrentBuild', () => {
  const assets = ['./', './index.html', './assets/index-AbC123.js', './assets/index-Zz9.css'];

  it('recognises the page bundle in the new service worker asset list', () => {
    expect(isCurrentBuild(assets, 'https://sivochka.com/bouncy/assets/index-AbC123.js')).toBe(true);
  });

  it('reports an older bundle as outdated', () => {
    expect(isCurrentBuild(assets, 'https://sivochka.com/bouncy/assets/index-Old456.js')).toBe(false);
  });
});
