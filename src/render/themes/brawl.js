/**
 * Tema 'brawl' — «Бійці Арени» (Зіркова ліга).
 * Original chunky cel-shaded arena fighters: one bold silhouette each (cactus, robot,
 * shark, mushroom, dragon, ninja cat, luchador, bomb), thick comic outlines,
 * big white eyes with heavy brows and a hard cel shadow.
 */

const INK = '#111827';

const BRAWLERS = [
  { name: 'Кактус', type: 'cactus', base: '#69DB7C', dark: '#2F9E44', accent: '#F783AC' },
  { name: 'Робо', type: 'robot', base: '#A5D8FF', dark: '#4C6EF5', accent: '#FF6B6B' },
  { name: 'Акула', type: 'shark', base: '#4DABF7', dark: '#1864AB', belly: '#F1F3F5' },
  { name: 'Грибок', type: 'mushroom', base: '#FFE8CC', dark: '#E8A87C', cap: '#FA5252', capDark: '#C92A2A' },
  { name: 'Дракоша', type: 'dragon', base: '#FF922B', dark: '#D9480F', belly: '#FFE066', accent: '#FCC419' },
  { name: 'Ніндзя-Кіт', type: 'ninja', base: '#7950F2', dark: '#4527A0', accent: '#FA5252' },
  { name: 'Лучадор', type: 'lucha', base: '#E03131', dark: '#A61E1E', accent: '#FFD43B', skin: '#F2B38A' },
  { name: 'Бомбік', type: 'bomb', base: '#495057', dark: '#212529', accent: '#FF922B' },
];

export function drawBrawl(ctx, ball) {
  const f = BRAWLERS[ball.id % BRAWLERS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.04;
  const lw = Math.max(2.6, r * 0.1);

  ctx.save();
  ctx.scale(breathe, breathe);

  // 0. Super-charge aura: golden glow when quiet for long, pulsing red when loud
  if (mood === 'golden' || mood === 'chaos') {
    const pulse = 0.5 + 0.5 * Math.sin(ball.breathePhase * (mood === 'chaos' ? 9 : 2));
    const rgb = mood === 'golden' ? '255, 212, 59' : '255, 92, 122';
    ctx.fillStyle = `rgba(${rgb}, ${0.12 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, ${0.65 + pulse * 0.35})`;
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.13 + pulse * 0.04), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(ball.angle);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Silhouette parts behind the body (fin, spikes, ears, fuse...)
  drawBehind(ctx, f, r, lw, mood, ball);

  // 2. Cel-shaded body: flat base color + hard crescent shadow bottom-right
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = f.dark;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = f.base;
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 0.12, r * 0.97, 0, Math.PI * 2);
  ctx.fill();
  drawBodyPattern(ctx, f, r, lw, mood, ball);
  ctx.restore();

  // 3. Thick comic outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Parts in front (cap, mask, headband...) and the face
  drawFront(ctx, f, r, lw, mood, ball);

  // 5. Hard comic highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, -r * 0.5, r * 0.14, r * 0.07, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 6. Golden: a star badge bobbing above the head
  if (mood === 'golden') {
    const bob = Math.sin(ball.dreamPhase) * r * 0.08;
    ctx.save();
    ctx.translate(r * 0.78, -r * 0.78 + bob);
    ctx.rotate(Math.sin(ball.dreamPhase * 0.8) * 0.25);
    ctx.fillStyle = '#FFD43B';
    drawStar(ctx, 0, 0, r * 0.3, Math.max(1.8, lw * 0.7));
    ctx.restore();
  }

  ctx.restore();
}

// ── Silhouettes ──────────────────────────────────────────────────────────────

function drawBehind(ctx, f, r, lw, mood, ball) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  if (f.type === 'cactus') {
    // Side arms
    ctx.fillStyle = f.base;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(dir > 0 ? r * 0.75 : -r * 1.25, -r * 0.02, r * 0.5, r * 0.32, r * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(dir > 0 ? r * 0.95 : -r * 1.25, -r * 0.55, r * 0.3, r * 0.8, r * 0.15);
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'robot') {
    // Antenna with a bulb that blinks when loud
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, -r * 1.28);
    ctx.stroke();
    const on = mood !== 'chaos' || Math.sin(ball.breathePhase * 14) > 0;
    ctx.fillStyle = on ? f.accent : '#FFE3E3';
    ctx.beginPath();
    ctx.arc(0, -r * 1.34, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Ear bolts
    ctx.fillStyle = '#868E96';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(dir > 0 ? r * 0.86 : -r * 1.1, -r * 0.25, r * 0.24, r * 0.5, r * 0.08);
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'shark') {
    // Dorsal fin
    ctx.fillStyle = f.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.8);
    ctx.quadraticCurveTo(-r * 0.05, -r * 1.25, r * 0.28, -r * 1.42);
    ctx.quadraticCurveTo(r * 0.22, -r * 1.05, r * 0.4, -r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (f.type === 'dragon') {
    // Back spikes + little horns
    ctx.fillStyle = f.accent;
    for (const [x, s] of [[-0.45, 0.26], [0, 0.34], [0.45, 0.26]]) {
      ctx.beginPath();
      ctx.moveTo(r * (x - s * 0.7), -r * (Math.sqrt(1 - x * x) - 0.12));
      ctx.lineTo(r * x, -r * (Math.sqrt(1 - x * x) + s));
      ctx.lineTo(r * (x + s * 0.7), -r * (Math.sqrt(1 - x * x) - 0.12));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Tiny wings
    ctx.fillStyle = f.dark;
    for (const dir of [-1, 1]) {
      const flap = mood === 'chaos' ? Math.sin(ball.breathePhase * 16) * 0.25 : 0;
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.82, -r * 0.1);
      ctx.lineTo(dir * r * 1.32, -r * (0.55 + flap));
      ctx.lineTo(dir * r * 1.18, -r * 0.05);
      ctx.lineTo(dir * r * 1.3, r * 0.2);
      ctx.lineTo(dir * r * 0.88, r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'ninja') {
    // Cat ears
    for (const dir of [-1, 1]) {
      ctx.fillStyle = f.base;
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.25, -r * 0.88);
      ctx.lineTo(dir * r * 0.78, -r * 1.22);
      ctx.lineTo(dir * r * 0.85, -r * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FCC2D7';
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.42, -r * 0.82);
      ctx.lineTo(dir * r * 0.72, -r * 1.02);
      ctx.lineTo(dir * r * 0.75, -r * 0.62);
      ctx.closePath();
      ctx.fill();
    }
    // Headband tails flutter behind on the right
    const wave = Math.sin(ball.breathePhase * (mood === 'chaos' ? 10 : 2.5)) * r * 0.12;
    ctx.fillStyle = f.accent;
    for (const dy of [-0.05, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.85, -r * 0.42);
      ctx.quadraticCurveTo(r * 1.15, -r * (0.42 - dy) + wave, r * 1.38, -r * (0.25 - dy * 2) + wave);
      ctx.lineTo(r * 1.25, -r * (0.12 - dy * 2) + wave);
      ctx.quadraticCurveTo(r * 1.05, -r * (0.28 - dy) + wave * 0.5, r * 0.85, -r * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'lucha') {
    // Mohawk crest on top of the mask
    ctx.fillStyle = f.accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.92);
    ctx.lineTo(-r * 0.14, -r * 1.25);
    ctx.lineTo(0, -r * 1.12);
    ctx.lineTo(r * 0.14, -r * 1.28);
    ctx.lineTo(r * 0.22, -r * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (f.type === 'bomb') {
    // Metal cap + fuse + spark
    ctx.fillStyle = '#868E96';
    ctx.beginPath();
    ctx.roundRect(-r * 0.26, -r * 1.12, r * 0.52, r * 0.32, r * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.12);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.42, r * 0.38, -r * 1.42);
    ctx.stroke();
    if (mood !== 'sleeping' && mood !== 'golden') {
      const flick = 0.75 + 0.25 * Math.sin(ball.breathePhase * 22);
      const sparkR = r * (mood === 'chaos' ? 0.26 : 0.16) * flick;
      ctx.fillStyle = '#FF922B';
      drawSpark(ctx, r * 0.42, -r * 1.44, sparkR);
      ctx.fillStyle = '#FFE066';
      drawSpark(ctx, r * 0.42, -r * 1.44, sparkR * 0.55);
    }
  }
}

function drawBodyPattern(ctx, f, r, lw, mood, ball) {
  if (f.type === 'cactus') {
    // Vertical ribs
    ctx.strokeStyle = 'rgba(43, 138, 62, 0.65)';
    ctx.lineWidth = lw * 0.7;
    for (const x of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * Math.abs(x), r * 1.05, 0, x < 0 ? Math.PI * 0.62 : -Math.PI * 0.38, x < 0 ? Math.PI * 1.38 : Math.PI * 0.38);
      ctx.stroke();
    }
  } else if (f.type === 'shark') {
    ctx.fillStyle = f.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.72, r * 0.92, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
    // Gills
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.45)';
    ctx.lineWidth = lw * 0.55;
    for (const dx of [0, 0.12]) {
      ctx.beginPath();
      ctx.arc(-r * (0.72 + dx), r * 0.02, r * 0.18, -0.9, 0.9);
      ctx.stroke();
    }
  } else if (f.type === 'dragon') {
    ctx.fillStyle = f.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.78, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 72, 15, 0.55)';
    ctx.lineWidth = lw * 0.5;
    for (const y of [0.42, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * y);
      ctx.quadraticCurveTo(0, r * (y + 0.07), r * 0.4, r * y);
      ctx.stroke();
    }
  } else if (f.type === 'robot') {
    // Rivets
    ctx.fillStyle = 'rgba(76, 110, 245, 0.55)';
    for (const [x, y] of [[-0.62, 0.55], [0.62, 0.55], [-0.62, -0.55], [0.62, -0.55]]) {
      ctx.beginPath();
      ctx.arc(r * x, r * y, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (f.type === 'bomb') {
    // Metal sheen band
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.4, r * 0.25, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFront(ctx, f, r, lw, mood, ball) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  switch (f.type) {
    case 'cactus': {
      // Spines around the edge + flower on top
      ctx.strokeStyle = '#FFF9DB';
      ctx.lineWidth = Math.max(1.5, r * 0.05);
      for (const a of [-2.6, -2.1, -1.0, -0.5, 0.4, 2.75, 3.6]) {
        const cx = Math.cos(a) * r * 0.78;
        const cy = Math.sin(a) * r * 0.78;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.06, cy - r * 0.06);
        ctx.lineTo(cx + r * 0.06, cy + r * 0.06);
        ctx.moveTo(cx + r * 0.06, cy - r * 0.06);
        ctx.lineTo(cx - r * 0.06, cy + r * 0.06);
        ctx.stroke();
      }
      drawFlower(ctx, r * 0.3, -r * 0.9, r * 0.26, f.accent, lw * 0.6);
      drawEyes(ctx, r, mood, ball, { y: -0.1 });
      drawMouth(ctx, r, mood, { y: 0.4 });
      break;
    }
    case 'robot': {
      // Screen face with glowing pixel eyes
      ctx.fillStyle = '#1B2A41';
      ctx.beginPath();
      ctx.roundRect(-r * 0.64, -r * 0.48, r * 1.28, r * 0.78, r * 0.2);
      ctx.fill();
      ctx.stroke();
      const glow = mood === 'chaos' ? '#FF6B6B' : mood === 'golden' ? '#FFD43B' : '#3BC9DB';
      ctx.fillStyle = glow;
      ctx.strokeStyle = glow;
      ctx.lineWidth = Math.max(2.4, r * 0.1);
      for (const dir of [-1, 1]) {
        const x = dir * r * 0.3;
        if (mood === 'sleeping') {
          ctx.fillRect(x - r * 0.14, -r * 0.1, r * 0.28, r * 0.07);
        } else if (mood === 'golden') {
          drawHeart(ctx, x, -r * 0.1, r * 0.17);
        } else if (mood === 'chaos') {
          ctx.beginPath();
          ctx.moveTo(x - r * 0.12, -r * 0.24);
          ctx.lineTo(x + r * 0.12, r * 0.0);
          ctx.moveTo(x + r * 0.12, -r * 0.24);
          ctx.lineTo(x - r * 0.12, r * 0.0);
          ctx.stroke();
        } else {
          const look = Math.sin(ball.breathePhase * 0.7) * r * 0.05;
          ctx.fillRect(x - r * 0.1 + look, -r * 0.26, r * 0.2, r * 0.26);
        }
      }
      // Speaker grill mouth
      ctx.fillStyle = INK;
      const open = mood === 'chaos' ? 1.6 : 1;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(r * (i * 0.18 - 0.06), r * 0.46, r * 0.12, r * 0.14 * open);
      }
      break;
    }
    case 'shark': {
      drawEyes(ctx, r, mood, ball, { y: -0.2, angry: true });
      // Toothy grin on the belly line
      const calm = mood === 'sleeping';
      ctx.fillStyle = mood === 'chaos' ? '#7F1D1D' : INK;
      ctx.beginPath();
      if (calm) {
        ctx.moveTo(-r * 0.4, r * 0.28);
        ctx.quadraticCurveTo(0, r * 0.4, r * 0.4, r * 0.28);
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      } else {
        const depth = mood === 'chaos' ? 0.62 : 0.48;
        ctx.moveTo(-r * 0.5, r * 0.2);
        ctx.quadraticCurveTo(0, r * 0.3, r * 0.5, r * 0.2);
        ctx.quadraticCurveTo(r * 0.3, r * depth, 0, r * depth);
        ctx.quadraticCurveTo(-r * 0.3, r * depth, -r * 0.5, r * 0.2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 5; i++) {
          const x = -r * 0.36 + i * r * 0.18;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.07, r * 0.25);
          ctx.lineTo(x + r * 0.07, r * 0.25);
          ctx.lineTo(x, r * 0.36);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    case 'mushroom': {
      // Big spotted cap over the top half
      ctx.fillStyle = f.cap;
      ctx.beginPath();
      ctx.moveTo(-r * 1.18, -r * 0.08);
      ctx.bezierCurveTo(-r * 1.18, -r * 1.35, r * 1.18, -r * 1.35, r * 1.18, -r * 0.08);
      ctx.quadraticCurveTo(0, r * 0.12, -r * 1.18, -r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -r * 0.1);
      ctx.quadraticCurveTo(0, r * 0.06, r * 1.0, -r * 0.1);
      ctx.quadraticCurveTo(0, -r * 0.1, -r * 1.0, -r * 0.1);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      for (const [x, y, s] of [[-0.55, -0.42, 0.17], [0.05, -0.72, 0.2], [0.6, -0.38, 0.15], [-0.15, -0.3, 0.1]]) {
        ctx.beginPath();
        ctx.arc(r * x, r * y, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      drawEyes(ctx, r, mood, ball, { y: 0.3, s: 0.17, x: 0.3, brows: false });
      drawMouth(ctx, r, mood, { y: 0.66, w: 0.2 });
      break;
    }
    case 'dragon': {
      drawEyes(ctx, r, mood, ball, { y: -0.22, angry: true });
      // Snout with nostrils
      ctx.fillStyle = 'rgba(217, 72, 15, 0.8)';
      ctx.beginPath();
      ctx.arc(-r * 0.12, r * 0.12, r * 0.05, 0, Math.PI * 2);
      ctx.arc(r * 0.12, r * 0.12, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
      drawMouth(ctx, r, mood, { y: 0.36, fangs: true });
      if (mood === 'chaos') {
        // Puff of smoke
        ctx.fillStyle = 'rgba(222, 226, 230, 0.85)';
        const puff = (ball.breathePhase * 3) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(-r * 0.25 - Math.sin(puff) * r * 0.05, -r * 0.05 - (puff / 6) * r * 0.3, r * 0.08, 0, Math.PI * 2);
        ctx.arc(r * 0.25 + Math.sin(puff) * r * 0.05, -r * 0.05 - (puff / 6) * r * 0.3, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'ninja': {
      // Headband across the forehead
      ctx.fillStyle = f.accent;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillRect(-r, -r * 0.6, r * 2, r * 0.26);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.6);
      ctx.lineTo(r * 0.8, -r * 0.6);
      ctx.moveTo(-r * 0.92, -r * 0.34);
      ctx.lineTo(r * 0.92, -r * 0.34);
      ctx.stroke();
      // Metal plate on the band
      ctx.fillStyle = '#DEE2E6';
      ctx.beginPath();
      ctx.roundRect(-r * 0.2, -r * 0.62, r * 0.4, r * 0.3, r * 0.06);
      ctx.fill();
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      // Face mask over the lower half
      ctx.fillStyle = '#2B2D42';
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.18);
      ctx.quadraticCurveTo(0, r * 0.05, r, r * 0.18);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, r * 0.18);
      ctx.quadraticCurveTo(0, r * 0.05, r * 0.98, r * 0.18);
      ctx.stroke();
      drawEyes(ctx, r, mood, ball, { y: -0.06, angry: true, sclera: '#FFF3BF' });
      break;
    }
    case 'lucha': {
      // Yellow flame patches around the eyes
      ctx.fillStyle = f.accent;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.05, -r * 0.05);
        ctx.quadraticCurveTo(dir * r * 0.2, -r * 0.5, dir * r * 0.5, -r * 0.42);
        ctx.lineTo(dir * r * 0.78, -r * 0.55);
        ctx.quadraticCurveTo(dir * r * 0.74, -r * 0.1, dir * r * 0.55, r * 0.12);
        ctx.quadraticCurveTo(dir * r * 0.25, r * 0.2, dir * r * 0.05, -r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = lw * 0.7;
        ctx.stroke();
      }
      // Open mouth area showing skin
      ctx.fillStyle = f.skin;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.52, r * 0.36, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      drawEyes(ctx, r, mood, ball, { y: -0.14, x: 0.38, s: 0.17, angry: true });
      drawMouth(ctx, r, mood, { y: 0.5, w: 0.2 });
      break;
    }
    case 'bomb':
    default: {
      drawEyes(ctx, r, mood, ball, { y: -0.08, angry: true });
      drawMouth(ctx, r, mood, { y: 0.4 });
      break;
    }
  }
}

// ── Faces ────────────────────────────────────────────────────────────────────

/**
 * Big expressive brawler eyes.
 * sleeping: thick closed arcs · stirring: determined look with heavy brows ·
 * chaos: wide shocked eyes with tiny trembling pupils · golden: happy ^ ^.
 */
function drawEyes(ctx, r, mood, ball, opts = {}) {
  const { x = 0.32, y = -0.12, s = 0.2, angry = false, brows = true, sclera = '#FFFFFF' } = opts;
  const lw = Math.max(2.4, r * 0.09);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';

  for (const dir of [-1, 1]) {
    const ex = dir * r * x;
    const ey = r * y;

    if (mood === 'sleeping') {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(ex, ey - r * s * 0.3, r * s * 0.85, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      continue;
    }
    if (mood === 'golden') {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(ex, ey + r * s * 0.35, r * s * 0.8, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      continue;
    }

    const chaos = mood === 'chaos';
    const rx = r * s * (chaos ? 1.2 : 0.95);
    const ry = r * s * (chaos ? 1.3 : 1.1);
    ctx.fillStyle = sclera;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const jitter = chaos ? Math.sin(ball.breathePhase * 20 + dir) * r * 0.025 : 0;
    const look = chaos ? 0 : Math.sin(ball.breathePhase * 0.6) * r * s * 0.3;
    const pr = r * s * (chaos ? 0.38 : 0.55);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + look + jitter, ey + r * s * 0.12, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex + look + jitter - pr * 0.35, ey + r * s * 0.12 - pr * 0.4, pr * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (!brows) continue;
    // Heavy brows: angled down to the middle (determined) or raised (shocked)
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    if (chaos) {
      ctx.moveTo(ex - dir * rx * 0.9, ey - ry * 1.35);
      ctx.lineTo(ex + dir * rx * 0.9, ey - ry * 1.6);
    } else if (angry) {
      ctx.moveTo(ex + dir * rx * 1.0, ey - ry * 1.3);
      ctx.lineTo(ex - dir * rx * 0.9, ey - ry * 0.85);
    } else {
      ctx.moveTo(ex - rx * 0.9, ey - ry * 1.3);
      ctx.quadraticCurveTo(ex, ey - ry * 1.55, ex + rx * 0.9, ey - ry * 1.3);
    }
    ctx.stroke();
  }
}

function drawMouth(ctx, r, mood, opts = {}) {
  const { y = 0.38, w = 0.28, fangs = false } = opts;
  const lw = Math.max(2.4, r * 0.09);
  const my = r * y;
  const mw = r * w;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';

  if (mood === 'sleeping') {
    ctx.beginPath();
    ctx.arc(0, my - mw * 0.5, mw * 0.6, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    return;
  }

  if (mood === 'stirring') {
    // Cocky smirk with teeth
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(-mw, my - mw * 0.1);
    ctx.quadraticCurveTo(0, my + mw * 0.35, mw * 1.05, my - mw * 0.35);
    ctx.quadraticCurveTo(mw * 0.4, my + mw * 0.75, -mw, my - mw * 0.1);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-mw * 0.75, my);
    ctx.quadraticCurveTo(0, my + mw * 0.3, mw * 0.85, my - mw * 0.22);
    ctx.lineTo(mw * 0.6, my + mw * 0.05);
    ctx.quadraticCurveTo(0, my + mw * 0.45, -mw * 0.6, my + mw * 0.12);
    ctx.closePath();
    ctx.fill();
  } else {
    // Golden: big happy D grin · Chaos: yelling open mouth
    const chaos = mood === 'chaos';
    ctx.fillStyle = chaos ? '#7F1D1D' : INK;
    ctx.beginPath();
    if (chaos) {
      ctx.ellipse(0, my + mw * 0.2, mw * 0.85, mw * 0.8, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-mw, my - mw * 0.2);
      ctx.quadraticCurveTo(0, my - mw * 0.05, mw, my - mw * 0.2);
      ctx.quadraticCurveTo(mw * 0.9, my + mw * 0.95, 0, my + mw * 0.95);
      ctx.quadraticCurveTo(-mw * 0.9, my + mw * 0.95, -mw, my - mw * 0.2);
    }
    ctx.fill();
    ctx.stroke();
    // Tongue
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.ellipse(0, my + mw * (chaos ? 0.65 : 0.62), mw * 0.45, mw * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Top teeth
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-mw * 0.55, my - mw * (chaos ? 0.5 : 0.12), mw * 1.1, mw * 0.22);
  }

  if (fangs) {
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = lw * 0.5;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * mw * 0.7, my - mw * 0.15);
      ctx.lineTo(dir * mw * 0.35, my - mw * 0.15);
      ctx.lineTo(dir * mw * 0.52, my + mw * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

// ── Small shapes ─────────────────────────────────────────────────────────────

function drawFlower(ctx, cx, cy, s, color, lw) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * s * 0.6, cy + Math.sin(a) * s * 0.6, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#FFD43B';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSpark(ctx, cx, cy, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? s : s * 0.45;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.7);
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.1, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.1, cx, cy + s * 0.7);
  ctx.fill();
}

function drawStar(ctx, cx, cy, s, lw) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + Math.cos(rot) * s, cy + Math.sin(rot) * s);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * (s * 0.48), cy + Math.sin(rot) * (s * 0.48));
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}
