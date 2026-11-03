import { describe, it, expect } from 'vitest';
import {
  iconMic,
  iconCalibrate,
  iconGear,
  iconStar,
  iconLock,
  iconGift,
  iconParty,
  iconSparkles,
  iconLab,
  iconCamera,
  iconLaptop,
  iconSliders,
  iconVolume,
  iconTrash,
  iconCheck,
  renderStarJarSvg,
  getThemeCardIllustration,
} from '../src/ui/icons.js';

describe('Icons & Visuals SVG generator', () => {
  it('generates valid SVG for mic on and off', () => {
    const onSvg = iconMic(true);
    const offSvg = iconMic(false);
    expect(onSvg).toContain('<svg');
    expect(onSvg).toContain('icon-mic on');
    expect(offSvg).toContain('<svg');
    expect(offSvg).toContain('icon-mic off');
  });

  it('generates valid SVG for calibrate, gear, stars, trash, and check', () => {
    expect(iconCalibrate()).toContain('<svg');
    expect(iconGear()).toContain('<svg');
    expect(iconStar(true)).toContain('#FFD43B');
    expect(iconStar(false)).toContain('fill="none"');
    expect(iconTrash()).toContain('<svg');
    expect(iconCheck()).toContain('<svg');
  });

  it('generates valid SVG for lock, gift, party, sparkles, and lab', () => {
    expect(iconLock()).toContain('icon-lock');
    expect(iconGift()).toContain('icon-gift');
    expect(iconParty()).toContain('icon-party');
    expect(iconSparkles()).toContain('icon-sparkles');
    expect(iconLab()).toContain('icon-lab');
  });

  it('generates valid SVG for hardware adaptation icons (camera, laptop, sliders, volume)', () => {
    expect(iconCamera()).toContain('icon-camera');
    expect(iconLaptop()).toContain('icon-laptop');
    expect(iconSliders()).toContain('icon-sliders');
    expect(iconVolume()).toContain('icon-volume');
  });

  it('generates star jar SVG reflecting progress and goal', () => {
    const emptyJar = renderStarJarSvg(0, 20);
    expect(emptyJar).toContain('jar-glass-svg');
    expect(emptyJar).not.toContain('url(#jarFillGrad)');

    const halfJar = renderStarJarSvg(10, 20);
    expect(halfJar).toContain('url(#jarFillGrad)');
    expect(halfJar).toContain('<circle'); // floating stars inside

    const fullJar = renderStarJarSvg(20, 20);
    expect(fullJar).toContain('url(#jarFillGrad)');
    expect(fullJar).toContain('<polygon');
  });

  it('provides visual theme illustrations for all 10 themes including craft, blox, and brawl', () => {
    const themes = ['craft', 'blox', 'brawl', 'critters', 'space', 'bubbles', 'emoji', 'plastic', 'numbers', 'eyes'];
    for (const th of themes) {
      const svg = getThemeCardIllustration(th);
      expect(svg).toContain('<svg');
    }
  });
});
