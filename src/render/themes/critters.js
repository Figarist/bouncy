/**
 * Rich illustrative character designs for 'Сплюшки' (Sleepy Critters).
 * 6 unique, expressive creatures with multi-layered details,
 * vibrant spherical shading (no chalky white center),
 * fixed specular highlights, and golden dream thought bubbles.
 */

const CRITTERS = [
  {
    name: 'Буль',
    base: '#20C997',
    dark: '#0CA678',
    highlight: '#96F2D7',
    belly: '#C3FAE8',
    type: 'water',
  },
  {
    name: 'Пухан',
    base: '#FF922B',
    dark: '#D9480F',
    highlight: '#FFE8CC',
    belly: '#FFF4E6',
    type: 'monster',
  },
  {
    name: 'Зірка',
    base: '#FCC419',
    dark: '#D97706',
    highlight: '#FFF3BF',
    belly: '#FFF9DB',
    type: 'firefly',
  },
  {
    name: 'Шуршик',
    base: '#B197FC',
    dark: '#7048E8',
    highlight: '#E5DBFF',
    belly: '#F3F0FF',
    type: 'cat',
  },
  {
    name: 'Моргун',
    base: '#FF8787',
    dark: '#E03131',
    highlight: '#FFD8D8',
    belly: '#FFE3E3',
    type: 'cyclops',
  },
  {
    name: 'Ластик',
    base: '#69DB7C',
    dark: '#2B8A3E',
    highlight: '#D3F9D8',
    belly: '#EBFBEE',
    type: 'frog',
  },
];

export function drawCritter(ctx, ball) {
  const c = CRITTERS[ball.id % CRITTERS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.035;

  ctx.save();
  ctx.scale(breathe, breathe);

  // 1. Unique head ornaments & ears behind the body (sway with character tilt)
  ctx.save();
  ctx.rotate(ball.angle);
  drawBackFeatures(ctx, c, r, ball);
  ctx.restore();

  // 2. Main spherical body with rich 3D shading (FIXED world lighting: top-left to bottom-right)
  const bodyGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.12, 0, 0, r);
  bodyGrad.addColorStop(0, c.highlight);
  bodyGrad.addColorStop(0.35, c.base);
  bodyGrad.addColorStop(0.85, c.dark);
  bodyGrad.addColorStop(1, shadeColor(c.dark, -25));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle bottom rim light for spherical depth (fixed world lighting)
  const rimGrad = ctx.createRadialGradient(r * 0.25, r * 0.35, r * 0.6, 0, 0, r);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.05)');
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. Foreground character features & face (sway with character tilt)
  ctx.save();
  ctx.rotate(ball.angle);
  drawFrontFeatures(ctx, c, r, ball);

  // Rosy Cheeks
  ctx.fillStyle = 'rgba(255, 107, 107, 0.42)';
  ctx.beginPath();
  ctx.arc(-r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Expressive face according to mood
  drawFace(ctx, c, r, ball);
  ctx.restore();

  // 4. Crisp specular shine gleam (FIXED world lighting: top-left reflection!)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.25, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 5. Golden Mode Sleep Dreams (> 2 min of silence, floats upright above ball)
  if (mood === 'golden' && ball.id % 3 === 0) {
    drawDreamCloud(ctx, r, ball);
  }

  // 6. Golden halo if in golden combo
  if (mood === 'golden') {
    ctx.strokeStyle = 'rgba(255, 216, 77, 0.7)';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Head features drawn behind the body (ears, horns, antenna, frog eyes)
 */
function drawBackFeatures(ctx, c, r, ball) {
  if (c.type === 'cat') {
    // Шуршик: Sharp cat-owl ears with inner pink
    // Left ear
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.35);
    ctx.lineTo(-r * 0.6, -r * 1.05);
    ctx.lineTo(-r * 0.2, -r * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFA8A8';
    ctx.beginPath();
    ctx.moveTo(-r * 0.68, -r * 0.42);
    ctx.lineTo(-r * 0.58, -r * 0.95);
    ctx.lineTo(-r * 0.3, -r * 0.72);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.75);
    ctx.lineTo(r * 0.6, -r * 1.05);
    ctx.lineTo(r * 0.75, -r * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFA8A8';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.72);
    ctx.lineTo(r * 0.58, -r * 0.95);
    ctx.lineTo(r * 0.68, -r * 0.42);
    ctx.closePath();
    ctx.fill();
  } else if (c.type === 'monster') {
    // Пухан: Fluffy curved horns & ear tufts
    ctx.fillStyle = '#FFA94D';
    // Left horn
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Right horn
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.8, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Horn tips (gold)
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.arc(-r * 0.48, -r * 0.92, r * 0.11, 0, Math.PI * 2);
    ctx.arc(r * 0.48, -r * 0.92, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'firefly') {
    // Зірка: Glowing light antenna pulsing in rhythm
    const pulse = 0.8 + 0.3 * Math.sin(ball.breathePhase * 1.5);
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.15, 0, -r * 1.25);
    ctx.stroke();

    // Pulsing bulb
    ctx.fillStyle = `rgba(255, 238, 92, ${0.4 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, -r * 1.35, r * 0.32 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF3BF';
    ctx.beginPath();
    ctx.arc(0, -r * 1.35, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'water') {
    // Буль: Plump bouncy water-droplet tuft
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.85);
    ctx.quadraticCurveTo(0, -r * 1.35, r * 0.05, -r * 1.35);
    ctx.quadraticCurveTo(r * 0.22, -r * 1.1, r * 0.2, -r * 0.85);
    ctx.closePath();
    ctx.fill();

    // Droplet glint
    ctx.fillStyle = '#E6FCF5';
    ctx.beginPath();
    ctx.arc(-r * 0.04, -r * 1.15, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'frog') {
    // Ластик: Frog eyes perched high atop head
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.8, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EBFBEE';
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Frog pupils
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.8, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.45, -r * 0.8, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Character markings (bellies, stripes, paws)
 */
function drawFrontFeatures(ctx, c, r, ball) {
  if (c.type === 'cat') {
    // Forest forehead stripes
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, -r * 0.42);
    ctx.moveTo(-r * 0.22, -r * 0.65);
    ctx.lineTo(-r * 0.14, -r * 0.42);
    ctx.moveTo(r * 0.22, -r * 0.65);
    ctx.lineTo(r * 0.14, -r * 0.42);
    ctx.stroke();

    // Small rounded paws at bottom
    ctx.fillStyle = c.highlight;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, r * 0.85, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, r * 0.85, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'water') {
    // Light translucent belly
    ctx.fillStyle = 'rgba(211, 249, 216, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.45, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'frog') {
    // Striped belly
    ctx.fillStyle = 'rgba(216, 245, 218, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(43, 138, 62, 0.35)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.35, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.arc(0, r * 0.48, r * 0.32, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (c.type === 'monster') {
    // Warm creamy belly patch
    ctx.fillStyle = 'rgba(255, 244, 230, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Facial expressions for sleeping, stirring, and chaos
 */
function drawFace(ctx, c, r, ball) {
  const mood = ball.mood;

  if (mood === 'chaos') {
    // Screaming open mouth with terror
    if (c.type === 'cyclops') {
      drawDetailedEye(ctx, 0, -r * 0.12, r * 0.42, 1.0, true);
    } else if (c.type !== 'frog') {
      drawDetailedEye(ctx, -r * 0.32, -r * 0.12, r * 0.26, 1.0, true);
      drawDetailedEye(ctx, r * 0.32, -r * 0.12, r * 0.26, 1.0, true);
    }

    // Wide open mouth
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red tongue
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.56, r * 0.14, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Single cute tooth for Пухан
    if (c.type === 'monster') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-r * 0.06, r * 0.22);
      ctx.lineTo(r * 0.06, r * 0.22);
      ctx.lineTo(0, r * 0.34);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mood === 'stirring') {
    // One eye open / waking up
    if (c.type === 'cyclops') {
      // Half-closed drooping lid
      drawDetailedEye(ctx, 0, -r * 0.1, r * 0.38, 0.5, false);
    } else if (c.type === 'frog') {
      // Frog mouth open
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, r * 0.28, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // One eye curious, one half-closed
      drawDetailedEye(ctx, -r * 0.32, -r * 0.12, r * 0.24, 0.85, false);

      // Squinting right eye
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.12);
      ctx.lineTo(r * 0.46, -r * 0.12);
      ctx.stroke();

      // Curious small 'o' mouth
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.arc(0, r * 0.32, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Sleeping / peaceful
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = 'round';

    if (c.type === 'cyclops') {
      if (ball.isBlinking) {
        // Closed curved eyelid
        ctx.beginPath();
        ctx.arc(0, -r * 0.05, r * 0.26, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else {
        // Sleepy hooded eye
        drawDetailedEye(ctx, 0, -r * 0.06, r * 0.34, 0.3, false);
      }
    } else if (c.type !== 'frog') {
      // Sleeping curved eyelashes
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.08, r * 0.18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r * 0.32, -r * 0.08, r * 0.18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }

    // Peaceful gentle smile
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Cute tooth for Пухан even when smiling
    if (c.type === 'monster') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.08, r * 0.25, r * 0.05, 0, Math.PI);
      ctx.fill();
    }
  }
}

/**
 * Detailed expressive eye with iris, pupil, eyelid, and glints
 */
function drawDetailedEye(ctx, cx, cy, size, openRatio = 1.0, panicked = false) {
  ctx.save();
  // Clip to eyeball socket
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.clip();

  // Eyeball white
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Iris (colored ring)
  const irisR = size * (panicked ? 0.45 : 0.65);
  ctx.fillStyle = panicked ? '#3B82F6' : '#6366F1';
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx, cy, irisR * (panicked ? 0.35 : 0.6), 0, Math.PI * 2);
  ctx.fill();

  // Specular glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - size * 0.25, cy - size * 0.25, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Drooping sleepy eyelid
  if (openRatio < 1.0) {
    const lidDrop = (1.0 - openRatio) * (size * 2);
    ctx.fillStyle = '#FA5252';
    ctx.beginPath();
    ctx.rect(cx - size, cy - size, size * 2, lidDrop);
    ctx.fill();
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size + lidDrop);
    ctx.lineTo(cx + size, cy - size + lidDrop);
    ctx.stroke();
  }

  ctx.restore();

  // Eye outline
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Golden Silence Dream Cloud with icon
 */
function drawDreamCloud(ctx, r, ball) {
  const floatY = Math.sin(ball.dreamPhase) * (r * 0.08);
  const cloudX = r * 0.55;
  const cloudY = -r * 1.35 + floatY;

  ctx.save();

  // Small thought bubbles leading up
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.95 + floatY * 0.5, r * 0.06, 0, Math.PI * 2);
  ctx.arc(r * 0.4, -r * 1.1 + floatY * 0.7, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Fluffy cloud body
  const cr = r * 0.32;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 212, 59, 0.5)';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.arc(cloudX - cr * 0.5, cloudY, cr * 0.65, 0, Math.PI * 2);
  ctx.arc(cloudX, cloudY - cr * 0.35, cr * 0.8, 0, Math.PI * 2);
  ctx.arc(cloudX + cr * 0.5, cloudY, cr * 0.65, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Icon inside cloud
  const icon = ball.dreamType || 'star';
  const iconY = cloudY - cr * 0.08;

  if (icon === 'heart') {
    ctx.fillStyle = '#FF6B6B';
    drawHeart(ctx, cloudX, iconY, cr * 0.55);
  } else if (icon === 'crown') {
    ctx.fillStyle = '#FCC419';
    drawCrown(ctx, cloudX, iconY, cr * 0.55);
  } else if (icon === 'moon') {
    ctx.fillStyle = '#FFD43B';
    drawMoon(ctx, cloudX, iconY, cr * 0.55);
  } else {
    // Star
    ctx.fillStyle = '#FCC419';
    drawMiniStar(ctx, cloudX, iconY, cr * 0.6);
  }

  ctx.restore();
}

function drawMiniStar(ctx, cx, cy, s) {
  let rot = (Math.PI / 2) * 3;
  const spikes = 5;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * s, cy + Math.sin(rot) * s);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * (s * 0.42), cy + Math.sin(rot) * (s * 0.42));
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.bezierCurveTo(cx - s, cy - s * 0.4, cx - s * 0.5, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s, cx + s, cy - s * 0.4, cx, cy + s * 0.45);
  ctx.fill();
}

function drawCrown(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy + s * 0.4);
  ctx.lineTo(cx - s * 0.7, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.3, cy);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.3, cy);
  ctx.lineTo(cx + s * 0.7, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.4);
  ctx.closePath();
  ctx.fill();
}

function drawMoon(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.7, 0.4 * Math.PI, 1.6 * Math.PI);
  ctx.quadraticCurveTo(cx - s * 0.2, cy, cx, cy + s * 0.7);
  ctx.fill();
}

function shadeColor(color, percent) {
  let num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return color;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
