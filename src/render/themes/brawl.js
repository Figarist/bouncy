/**
 * Tema 'brawl' — «Бійці Арени» (Зіркова ліга).
 * 100% original procedural Cel-Shaded arcade characters with bold outlines,
 * star emblems, and super-charge effects inspired by mobile arena brawlers.
 */

const BRAWLERS = [
  {
    name: 'Спайкі',
    type: 'cactus',
    base: '#51CF66',
    dark: '#2B8A3E',
    accent: '#FA5252',
  },
  {
    name: 'Хамелеон',
    type: 'hoodie',
    base: '#37B24D',
    dark: '#237032',
    skin: '#F59F00',
    accent: '#FFD43B',
  },
  {
    name: 'Дрімун',
    type: 'sand',
    base: '#9775FA',
    dark: '#5F3DC4',
    skin: '#FCC2D7',
    accent: '#FFD43B',
  },
  {
    name: 'Ворон',
    type: 'crow',
    base: '#364FC7',
    dark: '#182461',
    beak: '#FCC419',
  },
  {
    name: 'Лучадор',
    type: 'lucha',
    base: '#FD7E14',
    dark: '#C92A2A',
    accent: '#FFD43B',
  },
  {
    name: 'Меха-Вольт',
    type: 'mecha',
    base: '#E03131',
    dark: '#862E9C',
    accent: '#FFD43B',
  },
];

export function drawBrawl(ctx, ball) {
  const f = BRAWLERS[ball.id % BRAWLERS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.04;

  ctx.save();
  ctx.scale(breathe, breathe);

  // 0. Super-charge ring underneath in Golden or Chaos state
  if (mood === 'chaos' || mood === 'golden') {
    ctx.save();
    ctx.rotate(ball.breathePhase * (mood === 'chaos' ? 3 : 1));
    ctx.strokeStyle = mood === 'chaos' ? '#FF5C7A' : '#FFD43B';
    ctx.lineWidth = Math.max(2.5, r * 0.12);
    ctx.setLineDash([r * 0.35, r * 0.2]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(ball.angle);

  // 1. Top ornaments (Cactus flower, Mecha horns)
  drawBrawlTopOrnament(ctx, f, r);

  // 2. Main Cel-Shaded Body
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, f.base);
  grad.addColorStop(0.75, f.base);
  grad.addColorStop(1, f.dark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Character-specific overlays & masks
  drawBrawlDetails(ctx, f, r, mood);

  // 3. Thick comic book black outline (Signature Brawler style)
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2.8, r * 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  //Sharp comic specular highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.22, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBrawlTopOrnament(ctx, f, r) {
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2.2, r * 0.09);

  if (f.type === 'cactus') {
    // Red cactus flower on top + side spikes
    ctx.fillStyle = f.accent;
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 1.05, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.18, -r * 1.05, r * 0.2, 0, Math.PI * 2);
    ctx.arc(0, -r * 1.18, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Side cactus spikes
    ctx.fillStyle = f.base;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.92, -r * 0.2);
      ctx.lineTo(dir * r * 1.18, -r * 0.05);
      ctx.lineTo(dir * r * 0.95, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'hoodie') {
    // Yellow button eyes on top of chameleon hood
    for (const dir of [-1, 1]) {
      ctx.fillStyle = f.accent;
      ctx.beginPath();
      ctx.arc(dir * r * 0.48, -r * 0.86, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(dir * r * 0.48, -r * 0.86, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBrawlDetails(ctx, f, r, mood) {
  if (f.type === 'cactus') {
    // Dark hollow cactus eyes & round mouth
    ctx.fillStyle = '#18181B';
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.strokeStyle = '#18181B';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.1, r * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.32, -r * 0.1, r * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      const eyeR = mood === 'chaos' ? r * 0.22 : r * 0.16;
      ctx.beginPath();
      ctx.arc(-r * 0.34, -r * 0.12, eyeR, 0, Math.PI * 2);
      ctx.arc(r * 0.34, -r * 0.12, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
    const mouthR = mood === 'chaos' ? r * 0.28 : r * 0.16;
    ctx.beginPath();
    ctx.arc(0, r * 0.28, mouthR, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (f.type === 'hoodie') {
    // Lower face peek under chameleon hood + lollipop stick
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(0, r * 0.28, r * 0.56, 0, Math.PI);
    ctx.fill();

    // Hood shadow line
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2.5, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, r * 0.22);
    ctx.quadraticCurveTo(0, -r * 0.05, r * 0.65, r * 0.22);
    ctx.stroke();

    // Big grin or shocked mouth
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (mood === 'chaos') {
      ctx.arc(0, r * 0.45, r * 0.26, 0, Math.PI * 2);
    } else {
      ctx.arc(0, r * 0.36, r * 0.32, 0, Math.PI);
    }
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (f.type === 'sand') {
    // Gold Star emblem on sleep hat
    ctx.fillStyle = f.accent;
    drawStar(ctx, 0, -r * 0.45, r * 0.28);

    // Sleepy face below hat
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2.4, r * 0.09);
    ctx.lineCap = 'round';
    if (mood === 'chaos') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.08, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.05, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.3, r * 0.05, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    // Sleep bubble in calm
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.fillStyle = 'rgba(116, 192, 252, 0.75)';
      ctx.beginPath();
      ctx.arc(r * 0.28, r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (f.type === 'crow') {
    // Sharp beak in center
    ctx.fillStyle = f.beak;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.05);
    ctx.lineTo(r * 0.38, r * 0.05);
    ctx.lineTo(0, r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fierce eyes above beak
    ctx.fillStyle = mood === 'chaos' ? '#FF6B6B' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.18, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.18, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  // Lucha / Mecha sunglasses or mask eyes
  ctx.fillStyle = f.accent;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2, r * 0.08);

  if (f.type === 'mecha') {
    // Cool angular V-shades
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.28);
    ctx.lineTo(0, -r * 0.06);
    ctx.lineTo(r * 0.7, -r * 0.28);
    ctx.lineTo(r * 0.52, r * 0.12);
    ctx.lineTo(0, -r * 0.02);
    ctx.lineTo(-r * 0.52, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Luchador flame eye patches
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.1, mood === 'chaos' ? r * 0.12 : r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.1, mood === 'chaos' ? r * 0.12 : r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  if (mood === 'chaos') {
    ctx.roundRect(-r * 0.35, r * 0.22, r * 0.7, r * 0.34, 6);
  } else {
    ctx.roundRect(-r * 0.32, r * 0.28, r * 0.64, r * 0.2, 5);
  }
  ctx.fill();
  ctx.stroke();
}

function drawStar(ctx, cx, cy, s) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + Math.cos(rot) * s, cy + Math.sin(rot) * s);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * (s * 0.45), cy + Math.sin(rot) * (s * 0.45));
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.8;
  ctx.stroke();
}
