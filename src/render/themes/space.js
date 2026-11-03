/**
 * Space / Cosmos Theme (Planets & Asteroids) for grades 5-6.
 * Spherical clipping, atmospheric terminator day/night shadow,
 * 2-pass planet rings (back half under planet, front half over planet).
 */

const PLANETS = [
  { name: 'Earth', type: 'earth', base: '#1D4ED8', glow: '#60A5FA' },
  { name: 'Mars', type: 'mars', base: '#B91C1C', glow: '#F87171' },
  { name: 'Jupiter', type: 'jupiter', base: '#C2410C', ring: true, glow: '#FDBA74' },
  { name: 'Sun', type: 'sun', base: '#FBBF24', glow: true },
  { name: 'Moon', type: 'moon', base: '#64748B', glow: '#94A3B8' },
  { name: 'Neptune', type: 'neptune', base: '#0369A1', glow: '#38BDF8' },
];

export function drawSpace(ctx, ball) {
  const p = PLANETS[ball.id % PLANETS.length];
  const r = ball.radius;

  // 1. Sun Solar Corona / Outer Glow
  if (p.glow === true) {
    const corona = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.55);
    corona.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
    corona.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
    corona.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Ring - Back Half (drawn *under* the planet)
  if (p.ring) {
    drawPlanetRing(ctx, r, true);
  }

  // 3. Planet Sphere with Surface Details (Clipped to Circle)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 3a. Base surface fill
  ctx.fillStyle = p.base;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // 3b. Surface features (rotate with planetary rotation)
  ctx.save();
  ctx.rotate(ball.angle);
  if (p.type === 'earth') {
    drawEarthSurface(ctx, r);
  } else if (p.type === 'jupiter') {
    drawJupiterBands(ctx, r);
  } else if (p.type === 'mars') {
    drawMarsSurface(ctx, r);
  } else if (p.type === 'neptune') {
    drawNeptuneSurface(ctx, r);
  } else if (p.type === 'moon') {
    drawMoonSurface(ctx, r);
  } else if (p.type === 'sun') {
    drawSunSurface(ctx, r);
  }
  ctx.restore();

  // 3c. Spherical Day/Night Terminator Shadow (except Sun)
  if (p.type !== 'sun') {
    const terminator = ctx.createRadialGradient(-r * 0.45, -r * 0.45, r * 0.2, 0, 0, r * 1.05);
    terminator.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    terminator.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
    terminator.addColorStop(0.8, 'rgba(5, 8, 22, 0.55)');
    terminator.addColorStop(1, 'rgba(3, 5, 15, 0.9)');

    ctx.fillStyle = terminator;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3d. Subtle atmospheric edge rim sheen
  if (p.glow && p.type !== 'sun') {
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();

  // 4. Ring - Front Half (drawn *over* the planet)
  if (p.ring) {
    drawPlanetRing(ctx, r, false);
  }
}

/**
 * 2-Pass Planet Ring (Saturn / Jupiter):
 * Back half curves behind planet (angles PI to 2PI in ring local coords),
 * Front half curves in front of planet (angles 0 to PI).
 */
function drawPlanetRing(ctx, r, isBackHalf) {
  ctx.save();
  ctx.rotate(-Math.PI / 7); // Tilt ring angle

  // Create clip region for front or back half
  ctx.beginPath();
  if (isBackHalf) {
    // Upper / back half (y < 0)
    ctx.rect(-r * 2.2, -r * 2.2, r * 4.4, r * 2.2);
  } else {
    // Lower / front half (y >= 0)
    ctx.rect(-r * 2.2, 0, r * 4.4, r * 2.2);
  }
  ctx.clip();

  // Outer ring band
  ctx.strokeStyle = 'rgba(234, 138, 70, 0.75)';
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner bright groove
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.9)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.5, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawEarthSurface(ctx, r) {
  // Green continents
  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  // Eurasia / Africa
  ctx.ellipse(-r * 0.1, -r * 0.15, r * 0.4, r * 0.28, Math.PI / 5, 0, Math.PI * 2);
  // Americas
  ctx.ellipse(-r * 0.55, r * 0.1, r * 0.25, r * 0.45, -Math.PI / 8, 0, Math.PI * 2);
  // Australia
  ctx.ellipse(r * 0.45, r * 0.35, r * 0.2, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // White wispy swirling clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.4, r * 0.5, r * 0.1, -Math.PI / 12, 0, Math.PI * 2);
  ctx.ellipse(r * 0.2, r * 0.1, r * 0.45, r * 0.08, Math.PI / 16, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.3, r * 0.5, r * 0.4, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawJupiterBands(ctx, r) {
  // Horizontal planetary cloud bands
  const bands = [
    { y: -0.65, h: 0.18, color: '#9A3412' },
    { y: -0.42, h: 0.22, color: '#EA580C' },
    { y: -0.15, h: 0.16, color: '#7C2D12' },
    { y: 0.05, h: 0.24, color: '#C2410C' },
    { y: 0.35, h: 0.18, color: '#9A3412' },
    { y: 0.58, h: 0.2, color: '#7C2D12' },
  ];

  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.fillRect(-r, b.y * r, r * 2, b.h * r);
  }

  // Great Red Spot
  ctx.fillStyle = '#B91C1C';
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.15, r * 0.24, r * 0.14, -Math.PI / 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.15, r * 0.16, r * 0.08, -Math.PI / 16, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMarsSurface(ctx, r) {
  // Dark rust volcanic plateaus
  ctx.fillStyle = '#7F1D1D';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.arc(r * 0.3, r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.arc(-r * 0.1, r * 0.35, r * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // White polar ice caps
  ctx.fillStyle = '#FEF2F2';
  ctx.beginPath();
  ctx.arc(0, -r * 0.88, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeptuneSurface(ctx, r) {
  // Deep azure with darker storm swirl
  ctx.fillStyle = '#075985';
  ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.35);

  // Great Dark Spot
  ctx.fillStyle = '#082F49';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.1, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Methane bright white cloud streaks
  ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
  ctx.fillRect(-r * 0.7, r * 0.25, r * 1.4, r * 0.06);
}

function drawMoonSurface(ctx, r) {
  // Dark lunar maria
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.3, r * 0.25, Math.PI / 4, 0, Math.PI * 2);
  ctx.ellipse(r * 0.25, r * 0.15, r * 0.35, r * 0.28, -Math.PI / 6, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.1, r * 0.45, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Craters with rim shadows
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(-r * 0.4, r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSunSurface(ctx, r) {
  // Bright glowing core with solar flares
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.65, '#FBBF24');
  grad.addColorStop(1, '#EA580C');
  ctx.fillStyle = grad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Flares
  ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, r * 0.2, r * 0.3, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.15, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}
