export function drawEmoji(ctx, ball) {
  const r = ball.radius;

  // Warm 3D golden sphere gradient
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.35, '#FBBF24');
  grad.addColorStop(0.85, '#D97706');
  grad.addColorStop(1, '#B45309');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Bottom rim reflex
  const reflex = ctx.createRadialGradient(r * 0.2, r * 0.35, r * 0.6, 0, 0, r);
  reflex.addColorStop(0, 'rgba(255, 255, 255, 0)');
  reflex.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
  ctx.fillStyle = reflex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sharp specular gleam (fixed world lighting)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.25, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Facial features sway with roly-poly angle
  ctx.save();
  ctx.rotate(ball.angle);

  // Rosy cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(-r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  const mood = ball.mood;

  if (mood === 'chaos') {
    // Wide panicked white eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.26, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Small black pupils
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Open round screaming mouth 'O'
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.38, r * 0.24, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.52, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'stirring') {
    // Puzzled waking face: one eye open, one squinting
    ctx.fillStyle = '#18181B';
    // Open eye
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Eye glint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.38, -r * 0.18, r * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Squinting line eye
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.15);
    ctx.lineTo(r * 0.48, -r * 0.15);
    ctx.stroke();

    // Small wavy mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.32);
    ctx.quadraticCurveTo(0, r * 0.22, r * 0.25, r * 0.32);
    ctx.stroke();
  } else {
    // Sleeping happy face
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';

    // Closed curved eyes ^ ^
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.12, r * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.12, r * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Gentle smile
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}
