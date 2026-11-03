/**
 * Particle system for:
 * - Floating 'Zzz' letters when class is quiet (adaptive contrast for light/dark theme)
 * - Bezier flying star trajectory into the star jar
 * - Golden star sparkles
 * - Bubble pop water droplets
 * - Confetti celebration when timer / goal finishes
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.flyingStars = [];
  }

  spawnZzz(x, y) {
    this.particles.push({
      type: 'zzz',
      x: x + (Math.random() - 0.5) * 16,
      y: y - 8,
      vx: (Math.random() - 0.5) * 8,
      vy: -16 - Math.random() * 14,
      size: 14 + Math.random() * 6,
      alpha: 0.95,
      decay: 0.45 + Math.random() * 0.2,
      letter: Math.random() > 0.35 ? 'z' : 'Z',
    });
  }

  spawnSparkle(x, y, color = '#FFD84D') {
    this.particles.push({
      type: 'sparkle',
      x,
      y,
      vx: (Math.random() - 0.5) * 45,
      vy: (Math.random() - 0.5) * 45,
      size: 3 + Math.random() * 4,
      alpha: 1.0,
      decay: 1.2,
      color,
    });
  }

  /**
   * Spawns an animated glowing star that flies along a smooth quadratic Bezier
   * curve right into the neck of the star jar.
   * @param {number} x0 start X
   * @param {number} y0 start Y
   * @param {number} x1 target X (jar)
   * @param {number} y1 target Y (jar)
   * @param {Function} [onArrive] callback when star enters the jar
   */
  spawnFlyingStar(x0, y0, x1, y1, onArrive = null) {
    // Control point bends high upwards for a playful arc
    const midX = (x0 + x1) * 0.5;
    const midY = Math.min(y0, y1) - Math.max(120, Math.abs(x1 - x0) * 0.35);

    this.flyingStars.push({
      x0, y0,
      cx: midX, cy: midY,
      x1, y1,
      t: 0,
      duration: 0.85, // seconds
      onArrive,
      spin: 0,
      scale: 1.4,
    });
  }

  spawnPop(x, y, radius) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        type: 'droplet',
        x: x + Math.cos(angle) * (radius * 0.8),
        y: y + Math.sin(angle) * (radius * 0.8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3,
        alpha: 0.85,
        decay: 1.8,
        color: '#74C0FC',
      });
    }
  }

  spawnConfetti(width, height) {
    const colors = ['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C', '#DA77F2', '#FFA94D'];
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        type: 'confetti',
        x: Math.random() * width,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 90,
        vy: 90 + Math.random() * 130,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        sizeW: 9 + Math.random() * 6,
        sizeH: 5 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt) {
    // 1. Regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;

      if (p.type === 'confetti') {
        p.rotation += p.rotSpeed * dt;
        p.vx += (Math.random() - 0.5) * 40 * dt;
      } else if (p.type === 'droplet') {
        p.vy += 120 * dt; // gravity
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Bezier flying stars
    for (let i = this.flyingStars.length - 1; i >= 0; i--) {
      const fs = this.flyingStars[i];
      fs.t += dt / fs.duration;
      fs.spin += dt * 6;

      const t = Math.min(1.0, fs.t);
      const omt = 1 - t;

      // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
      const curX = omt * omt * fs.x0 + 2 * omt * t * fs.cx + t * t * fs.x1;
      const curY = omt * omt * fs.y0 + 2 * omt * t * fs.cy + t * t * fs.y1;

      // Sparkle dust trail
      if (Math.random() < 0.75) {
        this.particles.push({
          type: 'sparkle',
          x: curX + (Math.random() - 0.5) * 12,
          y: curY + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          size: 2.5 + Math.random() * 3,
          alpha: 0.9,
          decay: 2.2,
          color: Math.random() > 0.4 ? '#FFE066' : '#FFF3BF',
        });
      }

      if (fs.t >= 1.0) {
        // Star has entered the jar!
        for (let s = 0; s < 14; s++) {
          this.spawnSparkle(fs.x1, fs.y1, '#FFD43B');
        }
        if (fs.onArrive) fs.onArrive();
        this.flyingStars.splice(i, 1);
      }
    }
  }

  render(ctx, isLightRoom = false) {
    if (this.particles.length === 0 && this.flyingStars.length === 0) return;
    ctx.save();

    // Render particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'zzz') {
        ctx.fillStyle = isLightRoom ? '#334155' : '#C5D8F8';
        ctx.font = `800 ${p.size}px Rubik, Nunito, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, p.x, p.y);
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'droplet') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.sizeW / 2, -p.sizeH / 2, p.sizeW, p.sizeH);
        ctx.restore();
      }
    }

    // Render flying stars
    for (const fs of this.flyingStars) {
      const t = Math.min(1.0, fs.t);
      const omt = 1 - t;
      const x = omt * omt * fs.x0 + 2 * omt * t * fs.cx + t * t * fs.x1;
      const y = omt * omt * fs.y0 + 2 * omt * t * fs.cy + t * t * fs.y1;

      // Scale up in flight, shrinks slightly at destination
      const scale = 16 * (1.2 + 0.4 * Math.sin(t * Math.PI));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(fs.spin);

      // Star outer glow
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.arc(0, 0, scale * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Sharp gold star
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#FFD43B';
      ctx.strokeStyle = '#F59F00';
      ctx.lineWidth = 2;
      drawStarPolygon(ctx, 0, 0, 5, scale, scale * 0.45);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}

function drawStarPolygon(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
