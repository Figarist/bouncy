/**
 * Tema 'blox' — «Блокс-Герої» (Оббі-аватари).
 * 100% original procedural Canvas cylindrical avatar heads with top studs,
 * expressive meme faces, and accessories inspired by obby/blocky platformers.
 */

const BLOX_AVATARS = [
  {
    name: 'Нубік',
    type: 'noob',
    skin: '#FFD43B',
    skinDark: '#F59F00',
    collar: '#1C7ED6',
  },
  {
    name: 'Бейкон',
    type: 'bacon',
    skin: '#F3D9FA',
    skinDark: '#CEB2D6',
    hair: '#8B4513',
    collar: '#3B5BDB',
  },
  {
    name: 'Оббі-Квін',
    type: 'queen',
    skin: '#FFDEEB',
    skinDark: '#FCC2D7',
    hair: '#F06595',
    collar: '#AE3EC9',
  },
  {
    name: 'Будівельник',
    type: 'builder',
    skin: '#FFE066',
    skinDark: '#F59F00',
    hat: '#FD7E14',
    collar: '#2B8A3E',
  },
  {
    name: 'Кібер-Блокс',
    type: 'cyber',
    skin: '#CED4DA',
    skinDark: '#868E96',
    visor: '#22B8CF',
    collar: '#212529',
  },
  {
    name: 'Голд-Лорд',
    type: 'gold',
    skin: '#212529',
    skinDark: '#0B0C0E',
    hood: '#FCC419',
    collar: '#E67700',
  },
];

export function drawBlox(ctx, ball) {
  const av = BLOX_AVATARS[ball.id % BLOX_AVATARS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.032;

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);

  const w = r * 1.72;
  const h = r * 1.78;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const bevel = r * 0.42;

  // 1. Top Stud (Classic cylindrical toy/avatar head connector)
  ctx.fillStyle = av.skinDark;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1.8, r * 0.07);
  ctx.beginPath();
  ctx.roundRect(-r * 0.36, -hh - r * 0.2, r * 0.72, r * 0.25, [4, 4, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // 2. Bottom Shirt Collar Accent
  ctx.fillStyle = av.collar;
  ctx.beginPath();
  ctx.roundRect(-hw * 0.78, hh - r * 0.14, w * 0.78, r * 0.26, [0, 0, 8, 8]);
  ctx.fill();
  ctx.stroke();

  // 3. Cylindrical Beveled Head
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.18, av.skin);
  grad.addColorStop(0.85, av.skin);
  grad.addColorStop(1, av.skinDark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, bevel);
  ctx.fill();
  ctx.stroke();

  // Glossy vertical cylindrical reflection on left side
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.roundRect(-hw + r * 0.14, -hh + r * 0.18, r * 0.18, h * 0.62, 99);
  ctx.fill();

  // 4. Avatar Hair / Helmets
  drawBloxAccessory(ctx, av, r, hw, hh);

  // 5. Iconic Avatar Face Expressions
  drawBloxFace(ctx, av, r, mood);

  // 6. Golden Silence Robux-style Emerald/Gold Hexagon Halo
  if (mood === 'golden') {
    ctx.strokeStyle = '#FFD43B';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.beginPath();
    ctx.roundRect(-hw - 4, -hh - 4, w + 8, h + 8, bevel + 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBloxAccessory(ctx, av, r, hw, hh) {
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1.8, r * 0.07);

  if (av.type === 'bacon') {
    // Iconic wavy brown strips hair
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.moveTo(-hw - 2, -hh + r * 0.35);
    ctx.quadraticCurveTo(-hw * 0.5, -hh - r * 0.28, 0, -hh - r * 0.18);
    ctx.quadraticCurveTo(hw * 0.6, -hh - r * 0.28, hw + 2, -hh + r * 0.35);
    ctx.lineTo(hw - r * 0.15, -hh + r * 0.08);
    ctx.lineTo(0, -hh + r * 0.16);
    ctx.lineTo(-hw + r * 0.15, -hh + r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'queen') {
    // Pink twin puffs on sides
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.arc(-hw - r * 0.08, -hh * 0.35, r * 0.34, 0, Math.PI * 2);
    ctx.arc(hw + r * 0.08, -hh * 0.35, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'builder') {
    // Orange Turbo Builder Hard Hat
    ctx.fillStyle = av.hat;
    ctx.beginPath();
    ctx.arc(0, -hh + r * 0.15, hw * 1.04, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hat brim
    ctx.fillStyle = '#F76707';
    ctx.beginPath();
    ctx.roundRect(-hw * 1.15, -hh + r * 0.08, hw * 2.3, r * 0.22, 6);
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'gold') {
    // Golden Dominus Hood Rim
    ctx.strokeStyle = av.hood;
    ctx.lineWidth = Math.max(3, r * 0.13);
    ctx.beginPath();
    ctx.roundRect(-hw + 3, -hh + 3, hw * 2 - 6, hh * 2 - 6, r * 0.36);
    ctx.stroke();
  }
}

function drawBloxFace(ctx, av, r, mood) {
  const isDarkFace = av.type === 'gold';
  const inkColor = isDarkFace ? '#FFD43B' : '#111827';

  if (av.type === 'cyber') {
    // Glowing neon visor
    ctx.fillStyle = mood === 'chaos' ? '#FF6B6B' : av.visor;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-r * 0.58, -r * 0.28, r * 1.16, r * 0.38, 6);
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'sleeping' || mood === 'golden') {
    // Peaceful closed eyes
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2.2, r * 0.085);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.08, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.08, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (mood === 'stirring') {
    // Iconic meme raised eyebrow + squinting eye
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.06, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.06, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Raised eyebrow arch
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2.2, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.24);
    ctx.lineTo(-r * 0.14, -r * 0.2);
    ctx.moveTo(r * 0.14, -r * 0.32);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.44, r * 0.48, -r * 0.26);
    ctx.stroke();
  } else {
    // Chaos: Wide shocked OOF eyes!
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouths
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Math.max(2.4, r * 0.09);
  ctx.lineCap = 'round';

  if (mood === 'chaos') {
    // Wide open "OOF!" mouth
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-r * 0.32, r * 0.22, r * 0.64, r * 0.38, 8);
    ctx.fill();
    // White teeth bar on top
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-r * 0.26, r * 0.24, r * 0.52, r * 0.12);
  } else if (mood === 'stirring') {
    // Wavy uncertain mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.34);
    ctx.quadraticCurveTo(0, r * 0.22, r * 0.25, r * 0.36);
    ctx.stroke();
  } else {
    // Classic asymmetrical confident smirk
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, r * 0.28);
    ctx.quadraticCurveTo(r * 0.08, r * 0.46, r * 0.34, r * 0.18);
    ctx.stroke();
  }
}
