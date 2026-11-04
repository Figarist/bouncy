/**
 * Tema 'capy' — «Капібари» (Спокійні друзі).
 * Round chill capybaras with a broad snout and tiny ears, each wearing one thing
 * on its head (a tangerine, a duckling, a flower...). Sleeping ones blow a nose bubble.
 */

const INK = '#2B1B12';

const CAPYS = [
  { name: 'Мандаринка', hat: 'orange', fur: '#D9A066', dark: '#A8703F', light: '#F0C895' },
  { name: 'Качечка', hat: 'duck', fur: '#CF9660', dark: '#9E683A', light: '#EBC092' },
  { name: 'Квіточка', hat: 'flower', fur: '#DCA56E', dark: '#AB7443', light: '#F2CC9C' },
  { name: 'Полуничка', hat: 'strawberry', fur: '#D39A63', dark: '#A26C3D', light: '#EDC496' },
  { name: 'Листочок', hat: 'leaf', fur: '#D8A16A', dark: '#A77141', light: '#EFC89A' },
  { name: 'Бантик', hat: 'bow', fur: '#CC935D', dark: '#9B6537', light: '#E9BD8E' },
];

export function drawCapy(ctx, ball) {
  const c = CAPYS[ball.id % CAPYS.length];
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

  // 1. Tiny round ears
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  for (const dir of [-1, 1]) {
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.ellipse(dir * r * 0.58, -r * 0.78, r * 0.17, r * 0.14, dir * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 2. Furry body
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, c.light);
  grad.addColorStop(0.5, c.fur);
  grad.addColorStop(1, c.dark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Broad, boxy capybara muzzle
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.roundRect(-r * 0.46, r * 0.02, r * 0.92, r * 0.6, r * 0.28);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.08, r * 0.12, r * 0.26, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nostrils
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.6, lw * 0.9);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * r * 0.12, r * 0.16);
    ctx.lineTo(dir * r * 0.17, r * 0.24);
    ctx.stroke();
  }

  drawCapyFace(ctx, r, mood, ball, lw);

  // 4. Whatever this capybara balances on its head (drawn 1.3× so it reads from the back row)
  ctx.save();
  ctx.translate(0, -r * 0.92);
  ctx.scale(1.3, 1.3);
  ctx.translate(0, r * 0.92);
  drawHat(ctx, c.hat, r, lw / 1.3, mood, ball);
  ctx.restore();

  // 5. Sleepy nose bubble
  if (mood === 'sleeping' || mood === 'golden') {
    const grow = 0.5 + 0.5 * Math.sin(ball.breathePhase * 0.8 + ball.id);
    const br = r * (0.08 + 0.14 * grow);
    ctx.fillStyle = 'rgba(165, 216, 255, 0.55)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1, lw * 0.5);
    ctx.beginPath();
    ctx.arc(r * 0.2 + br * 0.8, r * 0.22 + br * 0.2, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(r * 0.2 + br * 0.5, r * 0.22 - br * 0.15, br * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCapyFace(ctx, r, mood, ball, lw) {
  const ey = -r * 0.2;
  const ex = r * 0.36;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = lw * 1.1;

  if (mood === 'sleeping') {
    // The famous calm capybara stare, eyes shut
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * ex - r * 0.1, ey);
      ctx.lineTo(dir * ex + r * 0.1, ey);
      ctx.stroke();
    }
  } else if (mood === 'golden') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * ex, ey + r * 0.05, r * 0.1, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  } else if (mood === 'stirring') {
    // Half-lidded "hmm?" eyes
    ctx.beginPath();
    ctx.arc(-ex, ey, r * 0.08, 0, Math.PI * 2);
    ctx.arc(ex, ey, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-ex - r * 0.025, ey - r * 0.03, r * 0.025, 0, Math.PI * 2);
    ctx.arc(ex - r * 0.025, ey - r * 0.03, r * 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(-ex - r * 0.11, ey - r * 0.05);
    ctx.lineTo(-ex + r * 0.11, ey - r * 0.05);
    ctx.moveTo(ex - r * 0.11, ey - r * 0.05);
    ctx.lineTo(ex + r * 0.11, ey - r * 0.05);
    ctx.stroke();
  } else {
    // Chaos: wide eyes + sweat drop
    const j = Math.sin(ball.breathePhase * 18) * r * 0.015;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.arc(dir * ex, ey, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(dir * ex + j, ey, r * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#74C0FC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    const dy = ((ball.breathePhase * 0.8) % 1) * r * 0.1;
    ctx.beginPath();
    ctx.moveTo(r * 0.72, -r * 0.42 + dy);
    ctx.quadraticCurveTo(r * 0.84, -r * 0.24 + dy, r * 0.72, -r * 0.2 + dy);
    ctx.quadraticCurveTo(r * 0.6, -r * 0.24 + dy, r * 0.72, -r * 0.42 + dy);
    ctx.fill();
    ctx.stroke();
  }

  // Mouth
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  const my = r * 0.44;
  if (mood === 'chaos') {
    ctx.fillStyle = '#5C2B1E';
    ctx.beginPath();
    ctx.ellipse(0, my + r * 0.04, r * 0.11, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Little ω mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, my - r * 0.02);
    ctx.quadraticCurveTo(-r * 0.065, my + r * 0.07, 0, my - r * 0.01);
    ctx.quadraticCurveTo(r * 0.065, my + r * 0.07, r * 0.13, my - r * 0.02);
    ctx.stroke();
  }

  if (mood === 'golden' || mood === 'sleeping') {
    ctx.fillStyle = 'rgba(255, 135, 135, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.62, r * 0.05, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.62, r * 0.05, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHat(ctx, hat, r, lw, mood, ball) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  const hy = -r * 0.92;

  if (hat === 'orange') {
    // A tangerine balanced on top — wobbles when the class is loud
    const wob = mood === 'chaos' ? Math.sin(ball.breathePhase * 10) * r * 0.08 : 0;
    ctx.fillStyle = '#FF922B';
    ctx.beginPath();
    ctx.arc(wob, hy - r * 0.12, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(wob - r * 0.1, hy - r * 0.24, r * 0.08, r * 0.05, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#51CF66';
    ctx.beginPath();
    ctx.ellipse(wob + r * 0.1, hy - r * 0.44, r * 0.13, r * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hat === 'duck') {
    // Yellow duckling napping on the head
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.ellipse(0, hy - r * 0.04, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.16, hy - r * 0.24, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF922B';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, hy - r * 0.26);
    ctx.lineTo(r * 0.44, hy - r * 0.21);
    ctx.lineTo(r * 0.3, hy - r * 0.17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    if (mood === 'chaos') {
      ctx.arc(r * 0.2, hy - r * 0.28, r * 0.035, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = lw * 0.7;
      ctx.moveTo(r * 0.15, hy - r * 0.27);
      ctx.lineTo(r * 0.24, hy - r * 0.27);
      ctx.stroke();
    }
  } else if (hat === 'flower') {
    const fx = r * 0.42;
    const fy = -r * 0.72;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + ball.dreamPhase * 0.1;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * r * 0.15, fy + Math.sin(a) * r * 0.15, r * 0.11, r * 0.07, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#FCC419';
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hat === 'strawberry') {
    ctx.fillStyle = '#FA5252';
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, hy - r * 0.18);
    ctx.quadraticCurveTo(-r * 0.24, hy + r * 0.12, 0, hy + r * 0.16);
    ctx.quadraticCurveTo(r * 0.24, hy + r * 0.12, r * 0.24, hy - r * 0.18);
    ctx.quadraticCurveTo(0, hy - r * 0.3, -r * 0.24, hy - r * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF3BF';
    for (const [x, y] of [[-0.1, -0.08], [0.08, -0.06], [0, 0.04], [-0.12, 0.04], [0.12, 0.03]]) {
      ctx.beginPath();
      ctx.ellipse(r * x, hy + r * y, r * 0.02, r * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#40C057';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = -r * 0.18 + i * r * 0.12;
      ctx.moveTo(x, hy - r * 0.2);
      ctx.lineTo(x + r * 0.06, hy - r * 0.34);
      ctx.lineTo(x + r * 0.12, hy - r * 0.2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hat === 'leaf') {
    ctx.fillStyle = '#69DB7C';
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, hy + r * 0.08);
    ctx.quadraticCurveTo(-r * 0.4, hy - r * 0.2, -r * 0.1, hy - r * 0.48);
    ctx.quadraticCurveTo(r * 0.2, hy - r * 0.2, -r * 0.05, hy + r * 0.08);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2B8A3E';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, hy + r * 0.04);
    ctx.quadraticCurveTo(-r * 0.12, hy - r * 0.2, -r * 0.1, hy - r * 0.4);
    ctx.stroke();
  } else if (hat === 'bow') {
    const bx = -r * 0.42;
    const by = -r * 0.72;
    ctx.fillStyle = '#F783AC';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - r * 0.3, by - r * 0.25, bx - r * 0.28, by + r * 0.14);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + r * 0.3, by - r * 0.25, bx + r * 0.28, by + r * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
