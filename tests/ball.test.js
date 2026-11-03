import { describe, it, expect } from 'vitest';
import { Ball } from '../src/world/ball.js';

describe('Ball mechanics & Roly-Poly upright physics', () => {
  it('initializes upright with near-zero angle', () => {
    const ball = new Ball(100, 100, 30, 0);
    expect(Math.abs(ball.angle)).toBeLessThan(0.2);
  });

  it('restores upright orientation (angle -> 0) when tilted like a roly-poly toy', () => {
    const ball = new Ball(100, 100, 30, 1);
    ball.angle = 0.4; // Tilted ~23 degrees
    ball.angularVelocity = 0;

    // Simulate 1 second of animation update
    for (let i = 0; i < 60; i++) {
      ball.updateAnimation(1 / 60, 'green', false);
    }

    // Angle should have returned close to 0
    expect(Math.abs(ball.angle)).toBeLessThan(0.05);
  });

  it('strictly bounds angle within ±25 degrees (±0.45 rad) even under extreme velocity', () => {
    const ball = new Ball(100, 100, 30, 2);
    ball.angle = 0.45;
    ball.angularVelocity = 100; // violent spin

    ball.updateAnimation(1 / 60, 'green', false);

    expect(ball.angle).toBeLessThanOrEqual(0.45);
    expect(ball.angle).toBeGreaterThanOrEqual(-0.45);
  });

  it('assigns golden dream types to critters', () => {
    const ball0 = new Ball(50, 50, 20, 0);
    const ball3 = new Ball(50, 50, 20, 3);
    const ball6 = new Ball(50, 50, 20, 6);
    const validDreams = ['star', 'heart', 'crown', 'moon'];

    expect(validDreams).toContain(ball0.dreamType);
    expect(validDreams).toContain(ball3.dreamType);
    expect(validDreams).toContain(ball6.dreamType);
  });
});
