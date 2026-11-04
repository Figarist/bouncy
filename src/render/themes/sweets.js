/**
 * Tema 'sweets' — «Смаколики» (Кавай-їжа).
 * Round kawaii food friends: donut, strawberry, watermelon, cookie, tangerine,
 * avocado, apple and peach — each with a tiny glossy face and rosy cheeks.
 */

const INK = '#2D1B2E';

const FOODS = [
  { name: 'Пончик', type: 'donut', base: '#E8B07A', dark: '#C4864F', top: '#F783AC' },
  { name: 'Полуниця', type: 'strawberry', base: '#FF6B6B', dark: '#E03131', top: '#51CF66' },
  { name: 'Кавун', type: 'watermelon', base: '#69DB7C', dark: '#2F9E44', top: '#2B8A3E' },
  { name: 'Печенько', type: 'cookie', base: '#E0A96D', dark: '#B9783F', top: '#5C3A21' },
  { name: 'Мандарин', type: 'tangerine', base: '#FFA94D', dark: '#F76707', top: '#51CF66' },
  { name: 'Авокадо', type: 'avocado', base: '#C0EB75', dark: '#5C940D', top: '#A9764F' },
  { name: 'Яблучко', type: 'apple', base: '#FF8787', dark: '#C92A2A', top: '#8D6E63' },
  { name: 'Персик', type: 'peach', base: '#FFC9A8', dark: '#FF8A65', top: '#69DB7C' },
];

export function drawSweet(ctx, ball) {
  const f = FOODS[ball.id % FOODS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.035;
  const lw = Math.max(2, r * 0.07);

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (mood === 'golden') {
    ctx.fillStyle = 'rgba(255, 212, 59, 0.16)';
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  // 1. Stems and leaves behind the body
  drawTopBehind(ctx, f, r, lw);

  // 2. Glossy body
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, shade(f.base, 30));
  grad.addColorStop(0.5, f.base);
  grad.addColorStop(1, f.dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  drawPattern(ctx, f, r, lw, ball);
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Face (donut and avocado keep their face below the middle)
  const faceY = f.type === 'donut' ? r * 0.38 : f.type === 'avocado' ? -r * 0.28 : 0;
  drawKawaiiFace(ctx, r, mood, ball, faceY, lw, f.type === 'watermelon');

  // 4. Gloss
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.48, -r * 0.48, r * 0.15, r * 0.08, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  if (mood === 'golden') {
    const tw = 0.5 + 0.5 * Math.sin(ball.dreamPhase * 1.5 + ball.id);
    drawSparkle(ctx, r * 0.82, -r * 0.7, r * (0.08 + tw * 0.07));
    drawSparkle(ctx, -r * 0.9, r * 0.1, r * (0.05 + (1 - tw) * 0.06));
  }

  ctx.restore();
}

function drawTopBehind(ctx, f, r, lw) {
  if (f.type === 'strawberry' || f.type === 'tangerine' || f.type === 'peach') {
    ctx.fillStyle = f.top;
    if (f.type === 'strawberry') {
      // Leafy crown
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        ctx.lineTo(Math.cos(a) * r * 0.55, -r * 0.82 + Math.sin(a) * r * 0.32);
        ctx.lineTo(Math.cos(a + 0.4) * r * 0.25, -r * 0.88 + Math.sin(a + 0.4) * r * 0.12);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(r * 0.28, -r * 0.98, r * 0.28, r * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'apple') {
    ctx.strokeStyle = f.top;
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.04, -r * 1.05, r * 0.14, -r * 1.18);
    ctx.stroke();
    ctx.fillStyle = '#51CF66';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(r * 0.34, -r * 1.02, r * 0.24, r * 0.11, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawPattern(ctx, f, r, lw, ball) {
  switch (f.type) {
    case 'donut': {
      // Wavy pink frosting on top + sprinkles
      ctx.fillStyle = f.top;
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, -r);
      ctx.lineTo(r, r * 0.1);
      for (let i = 0; i <= 8; i++) {
        const x = r - (i / 8) * r * 2;
        const y = r * (i % 2 === 0 ? 0.1 : 0.26);
        ctx.quadraticCurveTo(x + r * 0.125, y + r * 0.08, x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      const colors = ['#FFFFFF', '#FFD43B', '#4DABF7', '#69DB7C', '#B197FC'];
      ctx.lineWidth = Math.max(1.6, r * 0.06);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + ball.id;
        const d = r * (0.25 + (i % 3) * 0.2);
        const x = Math.cos(a) * d;
        const y = -r * 0.25 + Math.sin(a) * d * 0.55;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a * 3) * r * 0.06, y - Math.sin(a * 3) * r * 0.06);
        ctx.lineTo(x + Math.cos(a * 3) * r * 0.06, y + Math.sin(a * 3) * r * 0.06);
        ctx.stroke();
      }
      break;
    }
    case 'strawberry': {
      ctx.fillStyle = '#FFF3BF';
      for (let i = 0; i < 12; i++) {
        const a = i * 2.39996;
        const d = r * (0.35 + (i % 4) * 0.15);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        if (Math.abs(y) < r * 0.3 && Math.abs(x) < r * 0.55) continue;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.035, r * 0.055, a, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'watermelon': {
      // Dark stripes
      ctx.strokeStyle = f.top;
      ctx.lineWidth = r * 0.14;
      for (const x of [-0.7, -0.25, 0.25, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(r * x, -r);
        ctx.bezierCurveTo(r * (x + 0.12), -r * 0.4, r * (x - 0.12), r * 0.4, r * x, r);
        ctx.stroke();
      }
      break;
    }
    case 'cookie': {
      ctx.fillStyle = f.top;
      for (const [x, y, s] of [[-0.55, -0.45, 0.12], [0.5, -0.5, 0.1], [0.62, 0.35, 0.12], [-0.6, 0.4, 0.1], [0.05, 0.68, 0.11], [0.1, -0.72, 0.09]]) {
        ctx.beginPath();
        ctx.ellipse(r * x, r * y, r * s, r * s * 0.8, x, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tangerine': {
      ctx.fillStyle = 'rgba(247, 103, 7, 0.35)';
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996;
        const d = r * (0.3 + (i % 5) * 0.14);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.025, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'avocado': {
      // Creamy flesh + a big round pit
      ctx.fillStyle = '#E9FAC8';
      ctx.beginPath();
      ctx.arc(0, r * 0.05, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      const pit = ctx.createRadialGradient(-r * 0.1, r * 0.28, r * 0.05, 0, r * 0.38, r * 0.34);
      pit.addColorStop(0, '#C08B62');
      pit.addColorStop(1, '#7C5233');
      ctx.fillStyle = pit;
      ctx.beginPath();
      ctx.arc(0, r * 0.38, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      break;
    }
    case 'peach': {
      // Soft crease
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.45)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r);
      ctx.quadraticCurveTo(r * 0.4, -r * 0.4, r * 0.15, r * 0.1);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function drawKawaiiFace(ctx, r, mood, ball, fy, lw, lightInk) {
  const ex = r * 0.3;
  const ink = lightInk ? '#1B3A1F' : INK;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = lw * 1.1;

  if (mood === 'sleeping') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, fy - r * 0.07, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (mood === 'golden') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, fy + r * 0.03, r * 0.12, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  } else {
    const chaos = mood === 'chaos';
    const s = chaos ? 1.35 : 1;
    const look = chaos ? Math.sin(ball.breathePhase * 18) * r * 0.015 : Math.sin(ball.breathePhase * 0.6) * r * 0.03;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(dir * ex + look, fy - r * 0.04, r * 0.1 * s, r * 0.13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(dir * ex + look - r * 0.035 * s, fy - r * 0.04 - r * 0.05 * s, r * 0.04 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mouth
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  const my = fy + r * 0.12;
  if (mood === 'chaos') {
    ctx.fillStyle = '#5C1A2B';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.04, r * 0.1, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'golden') {
    ctx.fillStyle = '#5C1A2B';
    ctx.beginPath();
    ctx.arc(0, my - r * 0.02, r * 0.12, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.06, r * 0.06, r * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, my - r * 0.02);
    ctx.quadraticCurveTo(-r * 0.05, my + r * 0.06, 0, my - r * 0.01);
    ctx.quadraticCurveTo(r * 0.05, my + r * 0.06, r * 0.1, my - r * 0.02);
    ctx.stroke();
  }

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255, 107, 129, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, my - r * 0.04, r * 0.11, r * 0.065, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.5, my - r * 0.04, r * 0.11, r * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chaos: a sweat drop
  if (mood === 'chaos') {
    ctx.fillStyle = '#74C0FC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.62, fy - r * 0.42);
    ctx.quadraticCurveTo(r * 0.74, fy - r * 0.24, r * 0.62, fy - r * 0.2);
    ctx.quadraticCurveTo(r * 0.5, fy - r * 0.24, r * 0.62, fy - r * 0.42);
    ctx.fill();
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
