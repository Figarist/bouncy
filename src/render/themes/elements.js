/**
 * Tema 'elements' — «Стихійці» (Звірята стихій).
 * Original round elemental creatures in the collectible-monster genre: each one has a
 * single element (spark, flame, wave, leaf, dream, stone, ice, ghost), a clear silhouette,
 * big glossy anime eyes and a floating element badge in golden silence.
 */

const INK = '#1F1A2E';

const CREATURES = [
  { name: 'Іскрик', type: 'spark', base: '#9BB5FF', dark: '#5C7CFA', light: '#DBE4FF', accent: '#FFE066' },
  { name: 'Вогник', type: 'flame', base: '#FF8A4C', dark: '#E8590C', light: '#FFD8A8', accent: '#FFF4E6' },
  { name: 'Хвилька', type: 'wave', base: '#8CE0F5', dark: '#3BC9DB', light: '#E3FAFC', accent: '#F783AC' },
  { name: 'Листочок', type: 'leaf', base: '#8CE99A', dark: '#40C057', light: '#EBFBEE', accent: '#2F9E44' },
  { name: 'Соня', type: 'dream', base: '#D0BFFF', dark: '#9775FA', light: '#F3F0FF', accent: '#FCC2D7' },
  { name: 'Камінчик', type: 'stone', base: '#B8B2A7', dark: '#857E72', light: '#E9E5DE', accent: '#74C69D' },
  { name: 'Крижик', type: 'ice', base: '#E7F5FF', dark: '#A5D8FF', light: '#FFFFFF', accent: '#4DABF7' },
  { name: 'Привидко', type: 'ghost', base: '#C5B8F0', dark: '#8C7BD1', light: '#F3F0FF', accent: '#E599F7' },
];

export function drawElement(ctx, ball) {
  const c = CREATURES[ball.id % CREATURES.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.035;
  const lw = Math.max(2, r * 0.07);

  ctx.save();
  ctx.scale(breathe, breathe);

  if (mood === 'golden') {
    ctx.fillStyle = 'rgba(255, 212, 59, 0.16)';
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.rotate(ball.angle);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  // 1. Ears, horns, frills behind the body
  drawBehind(ctx, c, r, lw, mood, ball);

  // 2. Soft round body
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, c.light);
  grad.addColorStop(0.5, c.base);
  grad.addColorStop(1, c.dark);
  ctx.fillStyle = grad;
  ctx.globalAlpha = c.type === 'ghost' ? 0.92 : 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  drawBodyPattern(ctx, c, r, lw);
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Face + front details
  drawFace(ctx, c, r, lw, mood, ball);
  drawFront(ctx, c, r, lw, mood, ball);

  // 4. Gloss
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, -r * 0.46, r * 0.14, r * 0.07, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 5. Element badge floats above in golden silence
  if (mood === 'golden') {
    const bob = Math.sin(ball.dreamPhase) * r * 0.08;
    drawBadge(ctx, c, r * 0.8, -r * 0.82 + bob, r * 0.24, lw * 0.8);
  }

  ctx.restore();
}

// ── Silhouettes ──────────────────────────────────────────────────────────────

function drawBehind(ctx, c, r, lw, mood, ball) {
  switch (c.type) {
    case 'spark': {
      // Round mouse-like ears + a zigzag lightning horn
      for (const dir of [-1, 1]) {
        ctx.fillStyle = c.dark;
        ctx.beginPath();
        ctx.arc(dir * r * 0.66, -r * 0.7, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = c.light;
        ctx.beginPath();
        ctx.arc(dir * r * 0.66, -r * 0.7, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      // Big lightning-bolt tail sticking out on the right
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.moveTo(r * 0.8, r * 0.35);
      ctx.lineTo(r * 1.2, r * 0.05);
      ctx.lineTo(r * 1.05, -r * 0.05);
      ctx.lineTo(r * 1.45, -r * 0.45);
      ctx.lineTo(r * 1.3, -r * 0.05);
      ctx.lineTo(r * 1.45, r * 0.02);
      ctx.lineTo(r * 0.95, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Zigzag forelock
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.9);
      ctx.lineTo(r * 0.02, -r * 1.25);
      ctx.lineTo(-r * 0.06, -r * 1.25);
      ctx.lineTo(r * 0.2, -r * 1.55);
      ctx.lineTo(r * 0.12, -r * 1.22);
      ctx.lineTo(r * 0.24, -r * 1.22);
      ctx.lineTo(r * 0.2, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'flame': {
      // Pointy fox ears with dark tips
      for (const dir of [-1, 1]) {
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.22, -r * 0.9);
        ctx.lineTo(dir * r * 0.7, -r * 1.3);
        ctx.lineTo(dir * r * 0.86, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5C2B1E';
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.55, -r * 1.12);
        ctx.lineTo(dir * r * 0.7, -r * 1.3);
        ctx.lineTo(dir * r * 0.75, -r * 1.05);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'wave': {
      // Frilly axolotl gills, three fronds each side
      ctx.fillStyle = c.accent;
      for (const dir of [-1, 1]) {
        for (const [a, len] of [[-0.55, 0.42], [-0.15, 0.48], [0.25, 0.4]]) {
          const sway = Math.sin(ball.breathePhase * 1.5 + a * 4) * 0.06;
          const ang = a + sway;
          const bx = dir * r * 0.85;
          const by = r * ang * 0.9 - r * 0.15;
          const tx = bx + dir * Math.cos(ang) * r * len;
          const ty = by + Math.sin(ang) * r * len - r * 0.1;
          ctx.beginPath();
          ctx.ellipse((bx + tx) / 2, (by + ty) / 2, r * len * 0.55, r * 0.1, dir > 0 ? ang - 0.25 : Math.PI - ang + 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }
    case 'leaf': {
      // Tall leaf ears
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(dir * r * 0.35, -r * 0.78);
        ctx.rotate(dir * 0.3);
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.1);
        ctx.quadraticCurveTo(-r * 0.3, -r * 0.35, 0, -r * 0.72);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.35, 0, r * 0.1);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.02);
        ctx.lineTo(0, -r * 0.6);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'dream': {
      // Floppy seal-pup flippers
      ctx.fillStyle = c.dark;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(dir * r * 0.92, r * 0.45, r * 0.3, r * 0.14, dir * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'stone': {
      // A crystal growing out of the back
      ctx.fillStyle = '#B197FC';
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.88);
      ctx.lineTo(r * 0.46, -r * 1.28);
      ctx.lineTo(r * 0.66, -r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E5DBFF';
      ctx.beginPath();
      ctx.moveTo(r * 0.12, -r * 0.94);
      ctx.lineTo(r * 0.2, -r * 1.14);
      ctx.lineTo(r * 0.34, -r * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ice': {
      // Icy crest of three shards
      ctx.fillStyle = c.dark;
      for (const [x, h] of [[-0.22, 0.34], [0, 0.48], [0.22, 0.34]]) {
        ctx.beginPath();
        ctx.moveTo(r * (x - 0.12), -r * 0.92);
        ctx.lineTo(r * x, -r * (0.95 + h));
        ctx.lineTo(r * (x + 0.12), -r * 0.92);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'ghost': {
      // Wispy tail curling from the top
      ctx.fillStyle = c.base;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.05, -r * 1.45, r * 0.4, -r * 1.3);
      ctx.quadraticCurveTo(r * 0.1, -r * 1.2, r * 0.25, -r * 0.92);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function drawBodyPattern(ctx, c, r, lw) {
  if (c.type === 'flame') {
    // Cream muzzle and chest
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.62, r * 0.62, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'spark' || c.type === 'leaf' || c.type === 'ice') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.72, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'stone') {
    // Cracks and a mossy cap
    ctx.strokeStyle = 'rgba(60, 50, 40, 0.45)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.2);
    ctx.lineTo(-r * 0.62, r * 0.32);
    ctx.lineTo(-r * 0.66, r * 0.52);
    ctx.moveTo(r * 0.7, r * 0.45);
    ctx.lineTo(r * 0.5, r * 0.6);
    ctx.stroke();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.55);
    for (let i = 0; i <= 8; i++) {
      const x = -r + (i / 8) * r * 2;
      ctx.lineTo(x, -r * (i % 2 ? 0.52 : 0.62));
    }
    ctx.lineTo(r, -r);
    ctx.lineTo(-r, -r);
    ctx.closePath();
    ctx.fill();
  } else if (c.type === 'ghost') {
    // Wavy translucent hem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    for (let i = 0; i <= 6; i++) {
      ctx.quadraticCurveTo(-r + (i - 0.5) * (r / 3), r * 0.75, -r + i * (r / 3), r * 0.55);
    }
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();
  } else if (c.type === 'dream') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.4, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFront(ctx, c, r, lw, mood, ball) {
  const loud = mood === 'chaos' || mood === 'stirring';

  if (c.type === 'spark' && loud) {
    // Little electric zaps around the body
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = lw;
    const n = mood === 'chaos' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const a = ball.breathePhase * 2 + i * 2.1;
      if (Math.sin(ball.breathePhase * 9 + i) < 0) continue;
      const x = Math.cos(a) * r * 1.1;
      const y = Math.sin(a) * r * 1.1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y - r * 0.1);
      ctx.lineTo(x + r * 0.02, y - r * 0.02);
      ctx.lineTo(x - r * 0.04, y + r * 0.02);
      ctx.lineTo(x + r * 0.1, y + r * 0.12);
      ctx.stroke();
    }
  } else if (c.type === 'flame') {
    // Flickering flame tuft on the forehead — bigger when it's loud
    const size = mood === 'chaos' ? 1.5 : mood === 'stirring' ? 1.15 : 0.85;
    const flick = 1 + Math.sin(ball.breathePhase * (mood === 'chaos' ? 18 : 6)) * 0.08;
    drawFlame(ctx, 0, -r * 0.62, r * 0.22 * size * flick, lw * 0.8);
  } else if (c.type === 'leaf') {
    // Sprout on top
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.98);
    ctx.quadraticCurveTo(r * 0.02, -r * 1.12, r * 0.04, -r * 1.2);
    ctx.stroke();
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * r * 0.13, -r * 1.2, r * 0.14, r * 0.07, dir * -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (c.type === 'dream') {
    // Whiskers
    ctx.strokeStyle = 'rgba(31, 26, 46, 0.6)';
    ctx.lineWidth = lw * 0.6;
    for (const dir of [-1, 1]) {
      for (const dy of [-0.04, 0.06]) {
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.32, r * (0.3 + dy));
        ctx.lineTo(dir * r * 0.62, r * (0.26 + dy * 2));
        ctx.stroke();
      }
    }
  } else if (c.type === 'ice') {
    // Tiny orange beak
    ctx.fillStyle = '#FFA94D';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.14);
    ctx.lineTo(r * 0.1, r * 0.14);
    ctx.lineTo(0, r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ── Faces ────────────────────────────────────────────────────────────────────

/**
 * Big glossy anime eyes. 'dream' (Соня) is always half-asleep, even when the class is
 * chatty — the running joke of the theme.
 */
function drawFace(ctx, c, r, lw, mood, ball) {
  const ex = r * 0.34;
  const ey = c.type === 'stone' ? -r * 0.12 : -r * 0.1;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = lw * 1.1;

  const sleepy = mood === 'sleeping' || (c.type === 'dream' && mood === 'stirring');

  if (sleepy) {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, ey - r * 0.05, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    if (c.type === 'dream' && mood === 'stirring') {
      // Half-open lids
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * ex - r * 0.13, ey + r * 0.02);
        ctx.lineTo(dir * ex + r * 0.13, ey + r * 0.02);
        ctx.stroke();
      }
    }
  } else if (mood === 'golden') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, ey + r * 0.06, r * 0.13, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  } else {
    const chaos = mood === 'chaos';
    const look = chaos ? 0 : Math.sin(ball.breathePhase * 0.6) * r * 0.03;
    for (const dir of [-1, 1]) {
      const x = dir * ex;
      if (chaos) {
        // Startled: white eyes with tiny pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.ellipse(x, ey, r * 0.15, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        const j = Math.sin(ball.breathePhase * 20 + dir) * r * 0.015;
        ctx.beginPath();
        ctx.arc(x + j, ey, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Shiny eyes: dark oval, colored lower half, two highlights
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(x + look, ey, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.dark;
        ctx.beginPath();
        ctx.ellipse(x + look, ey + r * 0.07, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + look - r * 0.04, ey - r * 0.06, r * 0.05, 0, Math.PI * 2);
        ctx.arc(x + look + r * 0.045, ey + r * 0.05, r * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Cheeks
  ctx.fillStyle = 'rgba(255, 107, 129, 0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.6, r * 0.14, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.6, r * 0.14, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (the penguin has a beak instead)
  if (c.type === 'ice' && mood !== 'chaos') return;
  const my = r * 0.26;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  if (mood === 'chaos') {
    ctx.fillStyle = '#5C1A2B';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.12, r * 0.12, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'golden') {
    ctx.fillStyle = '#5C1A2B';
    ctx.beginPath();
    ctx.arc(0, my, r * 0.14, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.08, r * 0.07, r * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'flame' || c.type === 'spark') {
    // Playful fang smile
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, my);
    ctx.quadraticCurveTo(-r * 0.06, my + r * 0.08, 0, my + r * 0.01);
    ctx.quadraticCurveTo(r * 0.06, my + r * 0.08, r * 0.12, my);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(r * 0.04, my + r * 0.03);
    ctx.lineTo(r * 0.1, my + r * 0.02);
    ctx.lineTo(r * 0.07, my + r * 0.1);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, my - r * 0.04, r * 0.1, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}

// ── Small shapes ─────────────────────────────────────────────────────────────

function drawFlame(ctx, cx, cy, s, lw) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.1, cy + s * 0.8, cx - s * 0.8, cy - s * 0.4, cx - s * 0.1, cy - s * 1.6);
  ctx.bezierCurveTo(cx, cy - s * 0.8, cx + s * 0.4, cy - s * 0.9, cx + s * 0.45, cy - s * 1.2);
  ctx.bezierCurveTo(cx + s * 1.1, cy - s * 0.3, cx + s * 1.0, cy + s * 0.8, cx, cy + s * 0.9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFE066';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.6);
  ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.5, cx - s * 0.4, cy - s * 0.2, cx, cy - s * 0.7);
  ctx.bezierCurveTo(cx + s * 0.4, cy - s * 0.2, cx + s * 0.5, cy + s * 0.5, cx, cy + s * 0.6);
  ctx.fill();
}

/** Round element badge: bolt, flame, drop, leaf, moon, gem, snowflake or ghost. */
function drawBadge(ctx, c, cx, cy, s, lw) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = c.dark;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(1.5, s * 0.16);
  const k = s * 0.6;
  ctx.beginPath();
  switch (c.type) {
    case 'spark':
      ctx.fillStyle = '#FAB005';
      ctx.moveTo(k * 0.2, -k);
      ctx.lineTo(-k * 0.5, k * 0.1);
      ctx.lineTo(0, k * 0.1);
      ctx.lineTo(-k * 0.2, k);
      ctx.lineTo(k * 0.5, -k * 0.1);
      ctx.lineTo(0, -k * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'flame':
    case 'wave':
      ctx.moveTo(0, -k);
      ctx.bezierCurveTo(k * 0.9, -k * 0.1, k * 0.7, k, 0, k);
      ctx.bezierCurveTo(-k * 0.7, k, -k * 0.9, -k * 0.1, 0, -k);
      ctx.fill();
      break;
    case 'leaf':
      ctx.ellipse(0, 0, k * 0.5, k, 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'dream':
      ctx.arc(0, 0, k * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(k * 0.38, -k * 0.3, k * 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'stone':
      ctx.moveTo(0, -k);
      ctx.lineTo(k * 0.75, -k * 0.2);
      ctx.lineTo(0, k);
      ctx.lineTo(-k * 0.75, -k * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'ice':
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.moveTo(Math.cos(a) * k, Math.sin(a) * k);
        ctx.lineTo(-Math.cos(a) * k, -Math.sin(a) * k);
      }
      ctx.stroke();
      break;
    case 'ghost':
    default:
      ctx.arc(0, -k * 0.15, k * 0.6, Math.PI, 0);
      ctx.lineTo(k * 0.6, k * 0.8);
      ctx.lineTo(k * 0.2, k * 0.5);
      ctx.lineTo(-k * 0.2, k * 0.8);
      ctx.lineTo(-k * 0.6, k * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}
