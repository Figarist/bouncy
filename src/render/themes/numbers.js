import { drawPlastic } from './plastic.js';

export function drawNumbers(ctx, ball) {
  // Draw rich glossy plastic base
  drawPlastic(ctx, ball);

  const num = (ball.id % 10) + 1;
  const r = ball.radius;

  // White circular badge with soft inset shadow (tilts with ball angle)
  ctx.save();
  ctx.rotate(ball.angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();

  // Bold number inside
  ctx.fillStyle = '#1E293B';
  ctx.font = `800 ${Math.round(r * 0.65)}px Rubik, Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 0, r * 0.04);
  ctx.restore();
}
