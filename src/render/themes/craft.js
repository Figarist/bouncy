/**
 * Tema 'craft' — «Крафт-Куби» (Піксель-світ).
 * Procedural voxel characters drawn on a real 8×8 pixel grid: every block gets a
 * deterministic noisy texture (like a sandbox-game tile), a voxel bevel and a pixel face.
 */

const INK = '#111827';

const CRAFT_BLOCKS = [
  {
    name: 'Кріпко',
    type: 'creeper',
    tex: ['#5DC24A', '#4CAF3B', '#7AD866', '#3E9A33', '#8FE07D'],
    face: '#14241A',
  },
  {
    name: 'Шахтар',
    type: 'miner',
    tex: ['#E2A577', '#D99A6C', '#E9B48A'],
    hair: ['#4A2C11', '#5C3A1A', '#3E2410'],
    eyes: '#3B82F6',
  },
  {
    name: 'Ендер',
    type: 'ender',
    tex: ['#1E1B2E', '#17142A', '#2A2540'],
    eyes: '#F0A6FF',
    pupil: '#C04BE0',
  },
  {
    name: 'Хрюша',
    type: 'piggy',
    tex: ['#F7A1B9', '#F48FAB', '#FAB4C8'],
    snout: '#FDC6D5',
    nostril: '#B03A5B',
  },
  {
    name: 'Слаймик',
    type: 'slime',
    tex: ['#7BD66B', '#8FE07D', '#6CC75C'],
    core: 'rgba(30, 110, 40, 0.38)',
  },
  {
    name: 'Ред-ТНТ',
    type: 'tnt',
    tex: ['#E03131', '#D12A2A', '#EE4545'],
    stripe: '#A61E1E',
    band: '#F1F3F5',
  },
  {
    name: 'Бджілка',
    type: 'bee',
    tex: ['#FCC419', '#FAB005', '#FFD43B'],
    stripe: ['#3B2A1A', '#2E2014'],
  },
  {
    name: 'Жабка',
    type: 'frog',
    tex: ['#51CF66', '#40C057', '#69DB7C'],
    belly: '#B2F2BB',
  },
];

export function drawCraft(ctx, ball) {
  const b = CRAFT_BLOCKS[ball.id % CRAFT_BLOCKS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.03;

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);

  const size = r * 1.78;
  const half = size * 0.5;
  const px = size / 8;
  const corner = r * 0.14;
  const lw = Math.max(2, r * 0.08);

  // Pixel painter in grid units (col, row from the top-left corner of the cube)
  const P = (col, row, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(-half + col * px, -half + row * px, w * px + 0.5, h * px + 0.5);
  };

  const isFlashing = b.type === 'creeper' && mood === 'chaos' && Math.sin(ball.breathePhase * 12) > 0.2;

  // 0. Golden aura behind the cube
  if (mood === 'golden') {
    ctx.fillStyle = 'rgba(255, 212, 59, 0.16)';
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.roundRect(-half - r * 0.14, -half - r * 0.14, size + r * 0.28, size + r * 0.28, corner + r * 0.14);
    ctx.fill();
    ctx.stroke();
  }

  // Parts that stick out of the cube (drawn behind it)
  drawBackParts(ctx, b, P, px, half, lw, mood, ball);

  // 1. Textured 8×8 voxel body
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-half, -half, size, size, corner);
  ctx.clip();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      P(col, row, 1, 1, isFlashing ? '#FFFFFF' : texel(b, col, row, ball.id));
    }
  }

  if (!isFlashing) drawBodyDetails(ctx, b, P, px, half);

  // Voxel bevel: light top/left edge, shaded bottom/right edge
  P(0, 0, 8, 1, 'rgba(255, 255, 255, 0.2)');
  P(0, 1, 1, 7, 'rgba(255, 255, 255, 0.1)');
  P(0, 7, 8, 1, 'rgba(0, 0, 0, 0.2)');
  P(7, 0, 1, 7, 'rgba(0, 0, 0, 0.12)');

  drawCraftFace(ctx, b, P, px, mood, ball, isFlashing);
  ctx.restore();

  // 2. Crisp outer voxel border
  ctx.strokeStyle = isFlashing ? '#FFD43B' : INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(-half, -half, size, size, corner);
  ctx.stroke();

  // Parts in front of the cube
  drawFrontParts(ctx, b, P, px, half, lw, mood, ball);

  // 3. Golden silence: floating pixel diamond + twinkle
  if (mood === 'golden') {
    const floatY = Math.sin(ball.dreamPhase) * (r * 0.1);
    drawPixelDiamond(ctx, 0, -half - r * 0.42 + floatY, px * 0.55);
    const tw = 0.5 + 0.5 * Math.sin(ball.dreamPhase * 2 + ball.id);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + tw * 0.6})`;
    const sx = half * 0.95;
    const sy = -half * 0.95;
    const s = px * (0.25 + tw * 0.25);
    ctx.fillRect(sx - s * 2, sy - s * 0.5, s * 4, s);
    ctx.fillRect(sx - s * 0.5, sy - s * 2, s, s * 4);
  }

  ctx.restore();
}

/** Deterministic noisy texture: the same block always gets the same pixels. */
function texel(b, col, row, id) {
  const n = hash(col, row, id % 7);
  if (b.type === 'miner' && (row < 2 || (row === 2 && (col === 0 || col === 7)))) {
    return b.hair[Math.floor(n * b.hair.length)];
  }
  if (b.type === 'bee' && (row === 4 || row === 6)) {
    return b.stripe[Math.floor(n * b.stripe.length)];
  }
  if (b.type === 'tnt') {
    if (row === 3 || row === 4) return b.band;
    if (col % 2 === 1) return b.stripe;
  }
  // First color dominates, the rest sprinkle in
  const tex = b.tex;
  return n < 0.5 ? tex[0] : tex[1 + Math.floor((n - 0.5) * 2 * (tex.length - 1))];
}

function hash(x, y, s) {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(s + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawBodyDetails(ctx, b, P, px, half) {
  if (b.type === 'slime') {
    P(2, 2, 4, 4, b.core);
  } else if (b.type === 'tnt') {
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(px * 1.55)}px Rubik, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 0, -half + px * 4.1);
  } else if (b.type === 'frog') {
    P(1, 5, 6, 3, b.belly);
    P(2, 5, 4, 1, 'rgba(255, 255, 255, 0.3)');
  }
}

function drawBackParts(ctx, b, P, px, half, lw, mood, ball) {
  if (b.type === 'bee') {
    // Translucent wings flap faster when the class gets loud
    const speed = mood === 'chaos' ? 24 : mood === 'stirring' ? 10 : 2.5;
    const flap = 0.75 + 0.25 * Math.sin(ball.breathePhase * speed);
    ctx.fillStyle = 'rgba(231, 245, 255, 0.85)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.8;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * (half + px * 0.1), -half + px * 0.6, px * 1.1, px * 1.9 * flap, dir * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (b.type === 'frog') {
    // Eye bumps sitting on top of the cube
    for (const col of [0.5, 5.5]) {
      ctx.fillStyle = b.tex[0];
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.roundRect(-half + col * px, -half - px * 1.3, px * 2, px * 2, px * 0.35);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawFrontParts(ctx, b, P, px, half, lw, mood, ball) {
  if (b.type === 'tnt') {
    // Fuse + spark
    ctx.strokeStyle = '#343A40';
    ctx.lineWidth = Math.max(2, px * 0.45);
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(px * 0.6, -half - px * 1.2);
    ctx.stroke();
    if (mood === 'chaos' || mood === 'stirring') {
      const flick = 0.7 + 0.3 * Math.sin(ball.breathePhase * 20);
      ctx.fillStyle = '#FF922B';
      ctx.beginPath();
      ctx.arc(px * 0.6, -half - px * 1.35, px * 0.75 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.arc(px * 0.6, -half - px * 1.35, px * 0.4 * flick, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.type === 'bee') {
    // Antennae
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, px * 0.35);
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * px * 1.2, -half);
      ctx.lineTo(dir * px * 1.9, -half - px * 1.3);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(dir * px * 1.9 - px * 0.4, -half - px * 1.7, px * 0.8, px * 0.8);
    }
  } else if (b.type === 'frog') {
    // Frog eyes live in the bumps above the cube
    for (const col of [0.5, 5.5]) {
      const x = -half + col * px;
      const y = -half - px * 1.3;
      if (mood === 'sleeping' || mood === 'golden') {
        ctx.fillStyle = INK;
        ctx.fillRect(x + px * 0.3, y + px * 0.9, px * 1.4, px * 0.45);
      } else {
        const big = mood === 'chaos' ? 0.15 : 0.3;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + px * big, y + px * big, px * (2 - big * 2), px * (2 - big * 2));
        ctx.fillStyle = INK;
        const shift = mood === 'stirring' ? Math.sin(ball.breathePhase) * px * 0.3 : 0;
        ctx.fillRect(x + px * 0.65 + shift, y + px * 0.65, px * 0.7, px * 0.7);
      }
    }
  }
}

/** Standard two-pixel eyes (white + pupil) at the given row. */
function stdEyes(P, mood, row, pupil, ball, { left = 1, right = 5 } = {}) {
  if (mood === 'sleeping' || mood === 'golden') {
    P(left, row + 0.55, 2, 0.45, INK);
    P(right, row + 0.55, 2, 0.45, INK);
    return;
  }
  if (mood === 'chaos') {
    // Wide shocked eyes: 2×2 white with a tiny trembling pupil
    const j = Math.sin(ball.breathePhase * 18) * 0.12;
    P(left, row - 0.5, 2, 1.6, '#FFFFFF');
    P(right, row - 0.5, 2, 1.6, '#FFFFFF');
    P(left + 0.6 + j, row, 0.8, 0.8, pupil);
    P(right + 0.6 + j, row, 0.8, 0.8, pupil);
    return;
  }
  // Stirring: classic pixel eyes, pupils glance side to side
  const look = Math.sin(ball.breathePhase * 0.7) > 0;
  P(left, row, 2, 1, '#FFFFFF');
  P(right, row, 2, 1, '#FFFFFF');
  P(left + (look ? 1 : 0), row, 1, 1, pupil);
  P(right + (look ? 1 : 0), row, 1, 1, pupil);
}

function blush(P, row) {
  P(0.2, row, 1, 0.7, 'rgba(255, 107, 107, 0.55)');
  P(6.8, row, 1, 0.7, 'rgba(255, 107, 107, 0.55)');
}

function drawCraftFace(ctx, b, P, px, mood, ball, isFlashing) {
  const calm = mood === 'sleeping' || mood === 'golden';

  if (b.type === 'creeper') {
    const ink = isFlashing ? '#2B2B2B' : b.face;
    if (calm) {
      P(1, 2.6, 2, 0.5, ink);
      P(5, 2.6, 2, 0.5, ink);
    } else {
      P(1, 2, 2, 2, ink);
      P(5, 2, 2, 2, ink);
    }
    const open = mood === 'chaos' ? 1 : 0;
    P(3, 4, 2, 1, ink);
    P(2, 5, 4, 1 + open * 0.5, ink);
    P(2, 6, 1, 1 + open, ink);
    P(5, 6, 1, 1 + open, ink);
    return;
  }

  if (b.type === 'ender') {
    if (calm) {
      P(0.5, 4.3, 2, 0.4, b.pupil);
      P(5.5, 4.3, 2, 0.4, b.pupil);
    } else {
      const h = mood === 'chaos' ? 1.5 : 1;
      const y = mood === 'chaos' ? 3.75 : 4;
      P(0, y, 3, h, b.eyes);
      P(5, y, 3, h, b.eyes);
      P(1, y, 1, h, b.pupil);
      P(6, y, 1, h, b.pupil);
    }
    if (mood === 'chaos') {
      const jaw = 0.5 + 0.5 * Math.abs(Math.sin(ball.breathePhase * 8));
      P(2, 6, 4, 0.6 + jaw, '#7B2C9E');
    }
    return;
  }

  if (b.type === 'miner') {
    stdEyes(P, mood, 4, b.eyes, ball);
    P(3, 5, 2, 1, 'rgba(120, 60, 30, 0.35)');
    if (mood === 'chaos') {
      P(2.5, 6, 3, 1.4, '#3B1F12');
    } else if (mood === 'golden') {
      P(2, 6, 4, 0.6, '#6B3E26');
      P(2, 5.6, 0.6, 0.6, '#6B3E26');
      P(5.4, 5.6, 0.6, 0.6, '#6B3E26');
      blush(P, 5);
    } else {
      P(3, 6.2, 2, 0.6, '#6B3E26');
    }
    return;
  }

  if (b.type === 'piggy') {
    stdEyes(P, mood, 2.5, INK, ball);
    P(2, 4, 4, 2, b.snout);
    P(2.7, 4.6, 0.8, 0.8, b.nostril);
    P(4.5, 4.6, 0.8, 0.8, b.nostril);
    if (mood === 'chaos') P(3, 6.4, 2, 1, '#8C2340');
    if (mood === 'golden') blush(P, 4.3);
    return;
  }

  if (b.type === 'slime') {
    if (calm) {
      P(1.5, 2.8, 1.5, 0.45, '#1E4620');
      P(5, 2.8, 1.5, 0.45, '#1E4620');
    } else {
      const s = mood === 'chaos' ? 1.4 : 1;
      P(1.5, 2.5, s, s, '#1E4620');
      P(5, 2.5, s, s, '#1E4620');
    }
    if (mood === 'chaos') P(3, 5, 2, 1.2, '#1E4620');
    else if (mood === 'golden') P(3, 5, 2, 0.5, '#1E4620');
    else P(3.5, 5, 1, 0.6, '#1E4620');
    return;
  }

  if (b.type === 'tnt') {
    stdEyes(P, mood, 1, INK, ball);
    if (mood === 'chaos') P(3, 5.6, 2, 1.4, INK);
    else if (mood === 'stirring') P(3, 6, 2, 0.5, INK);
    else if (mood === 'golden') blush(P, 6);
    return;
  }

  if (b.type === 'bee') {
    stdEyes(P, mood, 2, INK, ball);
    if (mood === 'chaos') P(3, 3.6, 2, 0.4, '#E8590C');
    else if (mood === 'golden') {
      P(3, 3.4, 2, 0.45, '#7A3E00');
      blush(P, 3);
    } else P(3.5, 3.4, 1, 0.45, '#7A3E00');
    return;
  }

  if (b.type === 'frog') {
    // Wide frog smile across the cube
    if (mood === 'chaos') {
      P(2, 2.5, 4, 2, '#1E4620');
      P(2.5, 3.6, 3, 0.9, '#FF8FA3');
    } else {
      P(1, 3, 6, 0.45, '#1E4620');
      P(0.6, 2.6, 0.6, 0.6, '#1E4620');
      P(6.8, 2.6, 0.6, 0.6, '#1E4620');
    }
    blush(P, 3.8);
  }
}

function drawPixelDiamond(ctx, cx, cy, u) {
  // 5-row pixel diamond: widths 2,4,4,2,1 (in u-sized pixels)
  const rows = [
    [-1, 2, '#99E9F2'],
    [-2, 4, '#3BC9DB'],
    [-2, 4, '#22B8CF'],
    [-1, 2, '#1098AD'],
    [-0.5, 1, '#0B7285'],
  ];
  ctx.fillStyle = INK;
  ctx.fillRect(cx - u * 1.5, cy - u * 3, u * 3, u * 0.5);
  for (let i = 0; i < rows.length; i++) {
    const [x, w] = rows[i];
    ctx.fillRect(cx + (x - 0.5) * u, cy + (i - 2.5) * u, (w + 1) * u, u * 1.5);
  }
  for (let i = 0; i < rows.length; i++) {
    const [x, w, color] = rows[i];
    ctx.fillStyle = color;
    ctx.fillRect(cx + x * u, cy + (i - 2.5) * u, w * u, u);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - u, cy - u * 1.5, u * 0.8, u * 0.8);
}
