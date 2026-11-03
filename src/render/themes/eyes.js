const IRIS_COLORS = [
  '#2563EB', '#16A34A', '#D97706', '#9333EA', '#0D9488', '#4F46E5'
];

export function drawEyes(ctx, ball, targetX = null, targetY = null) {
  const r = ball.radius;

  // Eyeball white with realistic spherical shading
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.2, 0, 0, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.7, '#F1F5F9');
  grad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Fine red capillary veins
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.25);
  ctx.lineTo(r * 0.85, r * 0.35);
  ctx.moveTo(-r * 0.65, -r * 0.15);
  ctx.lineTo(-r * 0.88, -r * 0.28);
  ctx.stroke();

  // Pupil looking direction
  let lookDx = 0;
  let lookDy = 0;
  if (targetX !== null && targetY !== null) {
    const dx = targetX - ball.x;
    const dy = targetY - ball.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.001) {
      const maxShift = r * 0.32;
      lookDx = (dx / len) * maxShift;
      lookDy = (dy / len) * maxShift;
    }
  }

  // Iris
  const irisColor = IRIS_COLORS[ball.id % IRIS_COLORS.length];
  const irisR = r * 0.46;
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Iris inner fiber gradient
  const irisGrad = ctx.createRadialGradient(lookDx, lookDy, irisR * 0.3, lookDx, lookDy, irisR);
  irisGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  irisGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Black pupil
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // Primary light glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(lookDx - irisR * 0.28, lookDy - irisR * 0.28, irisR * 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Secondary small bounce glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(lookDx + irisR * 0.25, lookDy + irisR * 0.25, irisR * 0.12, 0, Math.PI * 2);
  ctx.fill();
}
