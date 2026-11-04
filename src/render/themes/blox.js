/**
 * Tema 'blox' — «Блокс-Герої» (Оббі-аватари).
 * Original blocky avatar heads: a shaded cylinder-cube head with a top stud,
 * a shirt peeking out below, one clear accessory per avatar (hair, hard hat,
 * headphones, ninja hood, crown...) and simple meme faces for every mood.
 */

const INK = '#111827';

const BLOX_AVATARS = [
  { name: 'Нубік', type: 'noob', skin: '#F5CD30', shirt: '#1C7ED6' },
  { name: 'Бейкон', type: 'bacon', skin: '#F1C27D', shirt: '#2F9E44', hair: '#6B3A1E', hairLight: '#9C5A2E' },
  { name: 'Зірочка', type: 'star', skin: '#FFDBB8', shirt: '#AE3EC9', hair: '#F06595', hairLight: '#FAA2C1' },
  { name: 'Будівельник', type: 'builder', skin: '#F5CD30', shirt: '#F08C00', hat: '#FAB005', hatDark: '#E67700' },
  { name: 'Геймер', type: 'gamer', skin: '#C68E62', shirt: '#212529', phones: '#22B8CF', band: '#343A40' },
  { name: 'Ніндзя', type: 'ninja', skin: '#F1C27D', shirt: '#212529', hood: '#2B2D42', band: '#FA5252' },
  { name: 'Король', type: 'king', skin: '#F5CD30', shirt: '#C92A2A', crown: '#FCC419', crownDark: '#E67700' },
  { name: 'Зомбі', type: 'zombie', skin: '#8FD694', shirt: '#4C6EF5', patch: '#69B86E' },
];

export function drawBlox(ctx, ball) {
  const av = BLOX_AVATARS[ball.id % BLOX_AVATARS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.032;

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const w = r * 1.72;
  const h = r * 1.66;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const top = -hh - r * 0.04;
  const bevel = r * 0.4;
  const lw = Math.max(2, r * 0.075);

  // 0. Golden glow behind the avatar
  if (mood === 'golden') {
    ctx.fillStyle = 'rgba(255, 212, 59, 0.16)';
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.roundRect(-hw - r * 0.16, top - r * 0.16, w + r * 0.32, h + r * 0.32, bevel + r * 0.16);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  // 1. Shirt shoulders peeking out below the head
  ctx.fillStyle = av.shirt;
  ctx.beginPath();
  ctx.roundRect(-hw * 0.82, hh - r * 0.22, hw * 1.64, r * 0.38, [r * 0.1, r * 0.1, r * 0.06, r * 0.06]);
  ctx.fill();
  ctx.stroke();

  // 2. Accessories behind the head (long hair)
  drawBehindHead(ctx, av, r, hw, hh, top, lw, ball);

  // 3. Top stud (cylinder: body + elliptical cap)
  const studW = r * 0.66;
  ctx.fillStyle = shade(av.skin, -18);
  ctx.beginPath();
  ctx.roundRect(-studW / 2, top - r * 0.2, studW, r * 0.3, [r * 0.08, r * 0.08, 0, 0]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(av.skin, 12);
  ctx.beginPath();
  ctx.ellipse(0, top - r * 0.2, studW / 2, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Cylinder-cube head: horizontal shading reads as a rounded block
  const headColor = av.type === 'ninja' ? av.hood : av.skin;
  const grad = ctx.createLinearGradient(-hw, 0, hw, 0);
  grad.addColorStop(0, shade(headColor, -22));
  grad.addColorStop(0.22, shade(headColor, 14));
  grad.addColorStop(0.55, headColor);
  grad.addColorStop(1, shade(headColor, -28));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, top, w, h, bevel);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-hw, top, w, h, bevel);
  ctx.clip();
  drawOnHead(ctx, av, r, hw, hh, top, lw, mood);
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(-hw, top, w, h, bevel);
  ctx.stroke();

  // Vertical gloss strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.roundRect(-hw + r * 0.16, top + r * 0.3, r * 0.13, h * 0.5, 99);
  ctx.fill();

  // 5. Face
  drawBloxFace(ctx, av, r, mood, ball);

  // 6. Accessories over the head (hats, crown, headphones)
  drawOverHead(ctx, av, r, hw, hh, top, lw, mood, ball);

  // 7. Golden sparkles
  if (mood === 'golden') {
    for (let i = 0; i < 2; i++) {
      const p = ball.dreamPhase * 1.4 + i * Math.PI;
      const s = r * (0.09 + 0.06 * Math.sin(p));
      drawSparkle(ctx, (i ? -1 : 1) * hw * 1.05, top + r * (0.15 + i * 0.5), Math.max(1, s));
    }
  }

  ctx.restore();
}

function drawBehindHead(ctx, av, r, hw, hh, top, lw, ball) {
  if (av.type === 'star') {
    // Long hair falling behind the shoulders
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.roundRect(-hw - r * 0.14, top + r * 0.05, hw * 2 + r * 0.28, hh * 2 + r * 0.1, [r * 0.5, r * 0.5, r * 0.2, r * 0.2]);
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'ninja') {
    // Headband tails
    const wave = Math.sin(ball.breathePhase * 2.5) * r * 0.08;
    ctx.fillStyle = av.band;
    for (const dy of [0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(hw - r * 0.1, top + r * 0.42);
      ctx.lineTo(hw + r * 0.42, top + r * (0.32 + dy * 2) + wave);
      ctx.lineTo(hw + r * 0.38, top + r * (0.48 + dy * 2) + wave);
      ctx.lineTo(hw - r * 0.1, top + r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawOnHead(ctx, av, r, hw, hh, top, lw, mood) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  if (av.type === 'bacon') {
    // Chunky wavy "bacon" hair: a cap with three lighter stripes
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.moveTo(-hw, top + r * 0.62);
    ctx.quadraticCurveTo(-hw * 0.55, top + r * 0.3, -hw * 0.1, top + r * 0.5);
    ctx.quadraticCurveTo(hw * 0.4, top + r * 0.7, hw, top + r * 0.42);
    ctx.lineTo(hw, top - r);
    ctx.lineTo(-hw, top - r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = av.hairLight;
    ctx.lineWidth = lw * 1.2;
    for (const y of [0.12, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(-hw * 0.85, top + r * (y + 0.12));
      ctx.quadraticCurveTo(-hw * 0.3, top + r * (y - 0.05), hw * 0.1, top + r * (y + 0.08));
      ctx.quadraticCurveTo(hw * 0.5, top + r * (y + 0.18), hw * 0.85, top + r * y);
      ctx.stroke();
    }
  } else if (av.type === 'star') {
    // Side-swept bangs
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.moveTo(-hw, top + r * 0.75);
    ctx.quadraticCurveTo(-hw * 0.7, top + r * 0.2, hw * 0.25, top + r * 0.42);
    ctx.quadraticCurveTo(hw * 0.7, top + r * 0.5, hw, top + r * 0.85);
    ctx.lineTo(hw, top - r);
    ctx.lineTo(-hw, top - r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = av.hairLight;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.6, top + r * 0.2);
    ctx.quadraticCurveTo(-hw * 0.1, top + r * 0.1, hw * 0.3, top + r * 0.25);
    ctx.stroke();
  } else if (av.type === 'ninja') {
    // Open strip for the eyes + red headband above it
    ctx.fillStyle = av.skin;
    ctx.beginPath();
    ctx.roundRect(-hw * 0.8, top + r * 0.62, hw * 1.6, r * 0.52, r * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = av.band;
    ctx.fillRect(-hw, top + r * 0.3, hw * 2, r * 0.22);
    ctx.beginPath();
    ctx.moveTo(-hw, top + r * 0.3);
    ctx.lineTo(hw, top + r * 0.3);
    ctx.moveTo(-hw, top + r * 0.52);
    ctx.lineTo(hw, top + r * 0.52);
    ctx.stroke();
  } else if (av.type === 'zombie') {
    // Rotten patches + a stitched scar
    ctx.fillStyle = av.patch;
    ctx.beginPath();
    ctx.ellipse(hw * 0.55, top + r * 0.35, r * 0.22, r * 0.15, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-hw * 0.7, top + hh * 1.56, r * 0.18, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2F5233';
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.6, top + r * 0.22);
    ctx.lineTo(-hw * 0.15, top + r * 0.42);
    for (const t of [0.25, 0.55, 0.85]) {
      const x = -hw * 0.6 + hw * 0.45 * t;
      const y = top + r * (0.22 + 0.2 * t);
      ctx.moveTo(x - r * 0.04, y - r * 0.08);
      ctx.lineTo(x + r * 0.04, y + r * 0.08);
    }
    ctx.stroke();
  }
}

function drawOverHead(ctx, av, r, hw, hh, top, lw, mood, ball) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  if (av.type === 'builder') {
    // Hard hat: dome + ridge + brim
    ctx.fillStyle = av.hat;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.95, top + r * 0.36);
    ctx.bezierCurveTo(-hw * 0.95, top - r * 0.55, hw * 0.95, top - r * 0.55, hw * 0.95, top + r * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = av.hatDark;
    ctx.beginPath();
    ctx.roundRect(-r * 0.1, top - r * 0.28, r * 0.2, r * 0.6, r * 0.08);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = av.hat;
    ctx.beginPath();
    ctx.roundRect(-hw * 1.14, top + r * 0.28, hw * 2.28, r * 0.2, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-hw * 0.45, top - r * 0.08, r * 0.16, r * 0.07, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (av.type === 'gamer') {
    // Headphones: band over the top, big cups on the sides
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 3.2;
    ctx.beginPath();
    ctx.moveTo(-hw * 1.02, top + r * 0.6);
    ctx.bezierCurveTo(-hw * 1.02, top - r * 0.6, hw * 1.02, top - r * 0.6, hw * 1.02, top + r * 0.6);
    ctx.stroke();
    ctx.strokeStyle = av.band;
    ctx.lineWidth = lw * 1.6;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    const glow = mood === 'chaos' && Math.sin(ball.breathePhase * 12) > 0 ? '#FF6B6B' : av.phones;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = av.band;
      ctx.beginPath();
      ctx.roundRect(dir > 0 ? hw - r * 0.1 : -hw - r * 0.24, top + r * 0.48, r * 0.34, r * 0.66, r * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.roundRect(dir > 0 ? hw + r * 0.03 : -hw - r * 0.17, top + r * 0.6, r * 0.14, r * 0.42, r * 0.07);
      ctx.fill();
    }
  } else if (av.type === 'king') {
    // Golden crown with gems
    const cy = top + r * 0.06;
    ctx.fillStyle = av.crown;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.78, cy + r * 0.2);
    ctx.lineTo(-hw * 0.82, cy - r * 0.42);
    ctx.lineTo(-hw * 0.4, cy - r * 0.12);
    ctx.lineTo(0, cy - r * 0.55);
    ctx.lineTo(hw * 0.4, cy - r * 0.12);
    ctx.lineTo(hw * 0.82, cy - r * 0.42);
    ctx.lineTo(hw * 0.78, cy + r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = av.crownDark;
    ctx.fillRect(-hw * 0.78, cy + r * 0.04, hw * 1.56, r * 0.14);
    ctx.strokeRect(-hw * 0.78, cy + r * 0.04, hw * 1.56, r * 0.14);
    for (const [x, c] of [[-0.45, '#4DABF7'], [0, '#FA5252'], [0.45, '#51CF66']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(hw * x, cy + r * 0.11, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const x of [-0.82, 0, 0.82]) {
      ctx.fillStyle = '#FFF3BF';
      ctx.beginPath();
      ctx.arc(hw * x, cy - r * (x === 0 ? 0.55 : 0.42), r * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (av.type === 'star') {
    // Little bow on the side
    ctx.fillStyle = '#FFD43B';
    const bx = hw * 0.62;
    const by = top + r * 0.18;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - r * 0.24, by - r * 0.16);
    ctx.lineTo(bx - r * 0.24, by + r * 0.16);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + r * 0.24, by - r * 0.16);
    ctx.lineTo(bx + r * 0.24, by + r * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Faces: classic blocky smile when calm, suspicious raised brow when the class
 * gets chatty, wide "OOF!" when it's loud, ^ ^ with blush in golden silence.
 */
function drawBloxFace(ctx, av, r, mood, ball) {
  const ink = INK;
  const ey = r * 0.02;
  const ex = r * 0.3;
  const lw = Math.max(2.2, r * 0.085);
  const zombie = av.type === 'zombie';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = lw;

  // Eyes
  if (mood === 'sleeping') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, ey - r * 0.05, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (mood === 'golden') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, ey + r * 0.06, r * 0.12, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  } else if (mood === 'stirring') {
    // Classic tall oval eyes + one raised eyebrow
    const look = Math.sin(ball.breathePhase * 0.6) * r * 0.03;
    for (const dir of [-1, 1]) {
      const big = zombie && dir > 0 ? 1.35 : 1;
      ctx.beginPath();
      ctx.ellipse(dir * ex + look, ey, r * 0.075 * big, r * 0.13 * big, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(-ex - r * 0.14, ey - r * 0.22);
    ctx.lineTo(-ex + r * 0.12, ey - r * 0.2);
    ctx.moveTo(ex - r * 0.14, ey - r * 0.27);
    ctx.quadraticCurveTo(ex, ey - r * 0.42, ex + r * 0.16, ey - r * 0.3);
    ctx.stroke();
  } else {
    // Chaos: shocked white eyes with tiny pupils
    const j = Math.sin(ball.breathePhase * 20) * r * 0.02;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.arc(dir * ex, ey, r * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(dir * ex + j, ey, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ninja's mouth is behind the hood
  if (av.type === 'ninja') return;

  const my = r * 0.36;
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;

  if (mood === 'chaos') {
    // Big "OOF!" mouth
    ctx.fillStyle = '#3B0A0A';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.06, r * 0.2, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.15, r * 0.11, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'stirring') {
    // Sideways "hmm" smirk
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, my + r * 0.04);
    ctx.quadraticCurveTo(r * 0.05, my + r * 0.1, r * 0.24, my - r * 0.04);
    ctx.stroke();
  } else if (mood === 'golden') {
    // Wide open happy smile + blush
    ctx.fillStyle = '#3B0A0A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, my - r * 0.04);
    ctx.quadraticCurveTo(0, my + r * 0.0, r * 0.3, my - r * 0.04);
    ctx.quadraticCurveTo(r * 0.26, my + r * 0.3, 0, my + r * 0.3);
    ctx.quadraticCurveTo(-r * 0.26, my + r * 0.3, -r * 0.3, my - r * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-r * 0.2, my - r * 0.02, r * 0.4, r * 0.07);
    ctx.fillStyle = 'rgba(255, 107, 107, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, my - r * 0.08, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.55, my - r * 0.08, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (zombie) {
    // Stitched zombie mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, my);
    ctx.lineTo(r * 0.24, my);
    for (const x of [-0.16, 0, 0.16]) {
      ctx.moveTo(r * x, my - r * 0.06);
      ctx.lineTo(r * x, my + r * 0.06);
    }
    ctx.stroke();
  } else {
    // Classic friendly smile
    ctx.beginPath();
    ctx.arc(0, my - r * 0.2, r * 0.26, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  }
}

function drawSparkle(ctx, cx, cy, s) {
  ctx.fillStyle = '#FFF3BF';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 2);
  ctx.quadraticCurveTo(cx, cy, cx + s * 2, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + s * 2);
  ctx.quadraticCurveTo(cx, cy, cx - s * 2, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - s * 2);
  ctx.fill();
}

/** Lighten (+) or darken (−) a #RRGGBB color by a percentage. */
function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * (percent > 0 ? 255 - c : c))));
  const rr = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const bb = f(n & 255);
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, '0')}`;
}
