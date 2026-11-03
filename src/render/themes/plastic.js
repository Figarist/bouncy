const COLORS = [
  '#EF4444', '#F97316', '#FBBF24', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#E2E8F0', '#475569'
];

export function drawPlastic(ctx, ball) {
  const color = COLORS[ball.id % COLORS.length];
  const r = ball.radius;

  // 3D spherical gradient (tinted highlight, not chalky white)
  const grad = ctx.createRadialGradient(
    -r * 0.35, -r * 0.35, r * 0.1,
    0, 0, r
  );
  grad.addColorStop(0, shadeColor(color, 65));
  grad.addColorStop(0.3, color);
  grad.addColorStop(0.85, shadeColor(color, -35));
  grad.addColorStop(1, shadeColor(color, -60));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Bottom-up subtle ambient reflex
  const reflex = ctx.createRadialGradient(r * 0.2, r * 0.35, r * 0.6, 0, 0, r);
  reflex.addColorStop(0, 'rgba(255, 255, 255, 0)');
  reflex.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
  ctx.fillStyle = reflex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sharp glossy specular gleam
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.3, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
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
