/**
 * Tema 'craft' — «Крафт-Куби» (Піксель-світ).
 * 100% original procedural Canvas voxel/pixel-art characters inspired by sandbox block games.
 * Safe from copyright/trademark strikes while instantly recognizable and loved by kids.
 */

const CRAFT_BLOCKS = [
  {
    name: 'Кріпко',
    type: 'creeper',
    base: '#40C057',
    dark: '#2B8A3E',
    light: '#8CE99A',
    pixelA: '#2F9E44',
    pixelB: '#69DB7C',
  },
  {
    name: 'Стіві',
    type: 'miner',
    base: '#E59966',
    dark: '#B86B3B',
    light: '#F5CBA7',
    hair: '#4A2C11',
    eyes: '#3BC9DB',
  },
  {
    name: 'Ендер',
    type: 'ender',
    base: '#1E1B2E',
    dark: '#0F0D18',
    light: '#3B3355',
    eyes: '#E599F7',
    pupil: '#AE3EC9',
  },
  {
    name: 'Хрюша',
    type: 'piggy',
    base: '#F783AC',
    dark: '#D6336C',
    light: '#FCC2D7',
    snout: '#FAA2C1',
  },
  {
    name: 'Слаймик',
    type: 'slime',
    base: '#74B816',
    dark: '#5C940D',
    light: '#A9E34B',
    core: '#2B8A3E',
  },
  {
    name: 'Ред-ТНТ',
    type: 'tnt',
    base: '#E03131',
    dark: '#A61E1E',
    light: '#FF8787',
    band: '#F8F9FA',
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
  const corner = r * 0.26;

  // Creeper flash effect in chaos (Red Zone)
  const isFlashing = b.type === 'creeper' && mood === 'chaos' && Math.sin(ball.breathePhase * 12) > 0.2;

  // 1. Main Beveled Cube Body
  ctx.fillStyle = isFlashing ? '#FFFFFF' : b.base;
  drawRoundedRect(ctx, -half, -half, size, size, corner);
  ctx.fill();

  // Top bevel highlight (voxel lighting)
  ctx.fillStyle = isFlashing ? '#F8F9FA' : b.light;
  ctx.beginPath();
  ctx.roundRect(-half + 2, -half + 2, size - 4, size * 0.22, [corner * 0.8, corner * 0.8, 0, 0]);
  ctx.fill();

  // Bottom shadow bevel
  ctx.fillStyle = isFlashing ? '#DEE2E6' : b.dark;
  ctx.beginPath();
  ctx.roundRect(-half + 2, half - size * 0.18, size - 4, size * 0.16, [0, 0, corner * 0.8, corner * 0.8]);
  ctx.fill();

  // 2. Character-specific pixel textures
  const px = size / 8; // 8x8 pixel grid unit

  if (b.type === 'creeper' && !isFlashing) {
    ctx.fillStyle = b.pixelA;
    ctx.fillRect(-half + px, -half + px, px, px);
    ctx.fillRect(half - px * 2, -half + px * 2, px, px);
    ctx.fillRect(-half + px, half - px * 2, px, px);
    ctx.fillStyle = b.pixelB;
    ctx.fillRect(-half + px * 2, -half + px, px, px);
    ctx.fillRect(half - px * 2, half - px * 2, px, px);
  } else if (b.type === 'miner') {
    // Pixel brown hair top + sideburns
    ctx.fillStyle = b.hair;
    ctx.beginPath();
    ctx.roundRect(-half, -half, size, px * 2.3, [corner, corner, 0, 0]);
    ctx.fill();
    ctx.fillRect(-half, -half + px * 2, px * 1.1, px * 1.5);
    ctx.fillRect(half - px * 1.1, -half + px * 2, px * 1.1, px * 1.5);
  } else if (b.type === 'slime') {
    // Inner dark slime cube core
    ctx.fillStyle = b.core;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(-px * 2.2, -px * 2.2, px * 4.4, px * 4.4);
    ctx.globalAlpha = 1.0;
  } else if (b.type === 'tnt') {
    // White label band across middle
    ctx.fillStyle = b.band;
    ctx.fillRect(-half + 2, -px * 1.2, size - 4, px * 2.4);
    // Fuse on top
    ctx.strokeStyle = '#343A40';
    ctx.lineWidth = Math.max(2, px * 0.45);
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(px * 0.6, -half - px * 1.2);
    ctx.stroke();
    if (mood === 'chaos' || mood === 'stirring') {
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.arc(px * 0.6, -half - px * 1.3, px * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Pixel Faces according to mood
  drawCraftFace(ctx, b, px, mood, ball);

  // 4. Crisp outer voxel border
  ctx.strokeStyle = isFlashing ? '#FFD43B' : '#111827';
  ctx.lineWidth = Math.max(2, r * 0.08);
  drawRoundedRect(ctx, -half, -half, size, size, corner);
  ctx.stroke();

  // 5. Golden Silence Diamond Crown / Halo
  if (mood === 'golden') {
    ctx.strokeStyle = '#3BC9DB';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    drawRoundedRect(ctx, -half - 4, -half - 4, size + 8, size + 8, corner + 3);
    ctx.stroke();

    // Floating pixel diamond above every 2nd block
    if (ball.id % 2 === 0) {
      const floatY = Math.sin(ball.dreamPhase) * (r * 0.1);
      ctx.fillStyle = '#3BC9DB';
      ctx.strokeStyle = '#0B7285';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -half - r * 0.55 + floatY);
      ctx.lineTo(r * 0.22, -half - r * 0.33 + floatY);
      ctx.lineTo(0, -half - r * 0.11 + floatY);
      ctx.lineTo(-r * 0.22, -half - r * 0.33 + floatY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCraftFace(ctx, b, px, mood, ball) {
  if (b.type === 'creeper') {
    ctx.fillStyle = '#111827';
    if (mood === 'sleeping' || mood === 'golden') {
      // Sleeping pixel eyes (flat bars)
      ctx.fillRect(-px * 2.5, -px * 0.8, px * 1.6, px * 0.6);
      ctx.fillRect(px * 0.9, -px * 0.8, px * 1.6, px * 0.6);
    } else {
      // Classic square creeper eyes
      ctx.fillRect(-px * 2.6, -px * 1.8, px * 1.7, px * 1.7);
      ctx.fillRect(px * 0.9, -px * 1.8, px * 1.7, px * 1.7);
    }
    // Iconic pixelated creeper mouth
    const mHeight = mood === 'chaos' ? px * 2.4 : px * 1.6;
    ctx.fillRect(-px * 0.9, px * 0.1, px * 1.8, mHeight);
    ctx.fillRect(-px * 1.8, px * 0.9, px * 0.9, mHeight);
    ctx.fillRect(px * 0.9, px * 0.9, px * 0.9, mHeight);
    return;
  }

  if (b.type === 'ender') {
    // Glowing purple pixel eyes
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.fillStyle = b.pupil;
      ctx.fillRect(-px * 3.0, -px * 0.3, px * 2.0, px * 0.5);
      ctx.fillRect(px * 1.0, -px * 0.3, px * 2.0, px * 0.5);
    } else {
      ctx.fillStyle = b.eyes;
      const eyeH = mood === 'chaos' ? px * 1.6 : px * 1.0;
      ctx.fillRect(-px * 3.2, -px * 0.8, px * 2.2, eyeH);
      ctx.fillRect(px * 1.0, -px * 0.8, px * 2.2, eyeH);
      ctx.fillStyle = b.pupil;
      ctx.fillRect(-px * 2.5, -px * 0.8, px * 0.9, eyeH);
      ctx.fillRect(px * 1.6, -px * 0.8, px * 0.9, eyeH);
    }
    if (mood === 'chaos') {
      // Shaking open ender jaw
      ctx.fillStyle = '#AE3EC9';
      ctx.fillRect(-px * 1.4, px * 1.2, px * 2.8, px * 1.6);
    }
    return;
  }

  // Standard pixel eyes for Miner, Piggy, Slime, TNT
  if (mood === 'sleeping' || mood === 'golden') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-px * 2.6, -px * 0.4, px * 1.6, px * 0.55);
    ctx.fillRect(px * 1.0, -px * 0.4, px * 1.6, px * 0.55);
  } else {
    const eyeH = mood === 'chaos' ? px * 1.6 : px * 1.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-px * 2.8, -px * 1.1, px * 1.8, eyeH);
    ctx.fillRect(px * 1.0, -px * 1.1, px * 1.8, eyeH);

    ctx.fillStyle = b.eyes || '#18181B';
    const shift = mood === 'stirring' ? px * 0.3 : 0;
    ctx.fillRect(-px * 2.1 + shift, -px * 1.1, px * 0.9, eyeH);
    ctx.fillRect(px * 1.2 + shift, -px * 1.1, px * 0.9, eyeH);
  }

  if (b.type === 'piggy') {
    // 3D Pixel Snout
    ctx.fillStyle = b.snout;
    ctx.fillRect(-px * 1.6, px * 0.3, px * 3.2, px * 1.9);
    ctx.fillStyle = '#A61E4D';
    ctx.fillRect(-px * 1.2, px * 0.8, px * 0.7, px * 0.9);
    ctx.fillRect(px * 0.5, px * 0.8, px * 0.7, px * 0.9);
  } else if (mood === 'chaos') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-px * 1.3, px * 0.8, px * 2.6, px * 1.7);
  } else {
    ctx.fillStyle = '#4A2C11';
    ctx.fillRect(-px * 1.1, px * 1.1, px * 2.2, px * 0.7);
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
