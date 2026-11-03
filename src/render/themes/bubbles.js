/**
 * Soap Bubbles Theme:
 * Chromatic iridescence, subtle organic edge wobble, and double specular reflections.
 */

export function drawBubble(ctx, ball) {
  const r = ball.radius;
  const phase = ball.breathePhase * 1.8;

  ctx.save();

  // Create slightly wobbling bubble path
  ctx.beginPath();
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Multi-frequency organic surface tension wobble
    const wobble = Math.sin(phase + angle * 3) * (r * 0.03) + Math.cos(phase * 1.2 + angle * 2) * (r * 0.02);
    const rad = r + wobble;
    const x = Math.cos(angle) * rad;
    const y = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Semi-transparent iridescent soap bubble body
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.22)');
  grad.addColorStop(0.65, 'rgba(240, 171, 252, 0.25)');
  grad.addColorStop(0.9, 'rgba(110, 231, 183, 0.45)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0.75)');

  ctx.fillStyle = grad;
  ctx.fill();

  // Thin chromatic soap film rim
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.stroke();

  // Top-left primary specular highlight crescent
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.34, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary soft bounce glint at bottom-right
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(r * 0.38, r * 0.38, r * 0.16, r * 0.08, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
