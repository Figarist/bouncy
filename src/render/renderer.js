import { drawPlastic } from './themes/plastic.js';
import { drawEmoji } from './themes/emoji.js';
import { drawNumbers } from './themes/numbers.js';
import { drawBubble } from './themes/bubbles.js';
import { drawEyes } from './themes/eyes.js';
import { drawCritter } from './themes/critters.js';
import { drawSpace } from './themes/space.js';
import { drawCraft } from './themes/craft.js';
import { drawBlox } from './themes/blox.js';
import { drawBrawl } from './themes/brawl.js';
import { ParticleSystem } from '../world/particles.js';

const ZZZ_THEMES = new Set(['critters', 'emoji', 'craft', 'blox', 'brawl']);

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.particles = new ParticleSystem();

    this.width = 1200;
    this.height = 800;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.theme = 'critters';
    this.isLightRoom = false;

    // Twinkling background stars
    this.bgStars = [];
    this.initBgStars();

    // Zzz spawn timer
    this.zzzTimer = 0;
  }

  initBgStars() {
    this.bgStars = [];
    for (let i = 0; i < 48; i++) {
      this.bgStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 1.2,
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setTheme(themeName) {
    this.theme = themeName;
  }

  setLightRoom(isLight) {
    this.isLightRoom = isLight;
  }

  render(world, zone, isGolden, dt, targetX = null, targetY = null) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Draw Atmospheric Background
    if (this.isLightRoom) {
      // High-contrast projector light theme (warm soft sky cream)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#F8FAFC');
      grad.addColorStop(0.5, '#F1F5F9');
      grad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Soft ambient light vignette at edges
      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.fillRect(0, h - 40, w, 40);
    } else {
      // Classroom focus night theme (deep indigo to twilight violet)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0F122B');
      grad.addColorStop(0.7, '#191538');
      grad.addColorStop(1, '#25133E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Twinkling stars in calm
      ctx.fillStyle = '#FFFFFF';
      for (const star of this.bgStars) {
        star.phase += dt * star.speed;
        const alpha = 0.2 + 0.35 * Math.sin(star.phase);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Periodic Zzz spawning when quiet
    if (zone === 'green' && ZZZ_THEMES.has(this.theme)) {
      this.zzzTimer += dt;
      if (this.zzzTimer > 1.2 && world.balls.length > 0) {
        this.zzzTimer = 0;
        const randomBall = world.balls[Math.floor(Math.random() * world.balls.length)];
        if (randomBall && randomBall.y > h * 0.35) {
          this.particles.spawnZzz(randomBall.x, randomBall.y - randomBall.radius);
        }
      }
    } else {
      this.zzzTimer = 0;
    }

    // 3. Contact Floor Shadows for all balls
    for (const ball of world.balls) {
      const distFromFloor = h - (ball.y + ball.radius);
      if (distFromFloor < ball.radius * 2.8) {
        const shadowFactor = Math.max(0, 1 - distFromFloor / (ball.radius * 2.8));
        const shadowRx = ball.radius * (0.8 + 0.35 * shadowFactor);
        const shadowRy = Math.max(2, ball.radius * 0.24 * shadowFactor);
        const alpha = (this.isLightRoom ? 0.22 : 0.42) * shadowFactor;

        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(ball.x, h - 3, shadowRx, shadowRy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Render Balls
    for (const ball of world.balls) {
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Squash and stretch
      ctx.scale(ball.scaleX, ball.scaleY);

      switch (this.theme) {
        case 'craft':
          drawCraft(ctx, ball);
          break;
        case 'blox':
          drawBlox(ctx, ball);
          break;
        case 'brawl':
          drawBrawl(ctx, ball);
          break;
        case 'plastic':
          drawPlastic(ctx, ball);
          break;
        case 'emoji':
          drawEmoji(ctx, ball);
          break;
        case 'numbers':
          drawNumbers(ctx, ball);
          break;
        case 'bubbles':
          drawBubble(ctx, ball);
          break;
        case 'eyes':
          drawEyes(ctx, ball, targetX, targetY);
          break;
        case 'space':
          drawSpace(ctx, ball);
          break;
        case 'critters':
        default:
          drawCritter(ctx, ball);
          break;
      }

      ctx.restore();
    }

    // 5. Update and render particles (with light-room contrast support)
    this.particles.update(dt);
    this.particles.render(ctx, this.isLightRoom);
  }
}
