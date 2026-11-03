import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../src/world/physics.js';

describe('PhysicsWorld voice reactions & simulations', () => {
  it('creates requested ball count within boundaries', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(30);

    expect(world.balls.length).toBe(30);
    for (const b of world.balls) {
      expect(b.x).toBeGreaterThanOrEqual(b.radius);
      expect(b.x).toBeLessThanOrEqual(1000 - b.radius);
      expect(b.y).toBeGreaterThanOrEqual(b.radius);
      expect(b.y).toBeLessThanOrEqual(800 - b.radius);
    }
  });

  it('scareBounce applies upward impulses on all balls', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(10);

    // Settle balls to floor
    for (const b of world.balls) {
      b.y = 800 - b.radius;
      b.py = b.y;
    }

    world.scareBounce(1.5);

    // In Verlet: py > y means upward velocity (since y - py is velocity)
    for (const b of world.balls) {
      const upwardVy = b.y - b.py;
      expect(upwardVy).toBeLessThan(0); // negative vy means moving up
    }
  });

  it('bounceBalls imparts significant upward impulse in breaktime mode', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(5);

    for (const b of world.balls) {
      b.y = 700;
      b.py = 700;
    }

    world.bounceBalls(20);

    for (const b of world.balls) {
      const vy = b.y - b.py;
      expect(vy).toBeLessThan(-10); // strong upward bounce
    }
  });

  it('stirBalls applies gentle tremble to balls near floor', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(20);

    for (const b of world.balls) {
      b.y = 800 - b.radius;
      b.py = b.y;
    }

    // Call multiple times to ensure probabilistic stir catches some balls
    for (let i = 0; i < 5; i++) {
      world.stirBalls(0.8);
    }

    // At least some balls should have received a hop/jitter
    const moved = world.balls.some(b => Math.abs(b.y - b.py) > 0.1 || Math.abs(b.x - b.px) > 0.1);
    expect(moved).toBe(true);
  });

  it('chaosAgitate sustains upward hops during continuous red zone noise', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(15);

    for (const b of world.balls) {
      b.y = 800 - b.radius;
      b.py = b.y;
    }

    for (let i = 0; i < 5; i++) {
      world.chaosAgitate(1.2);
    }

    const upwardBalls = world.balls.filter(b => b.y - b.py < -1.0);
    expect(upwardBalls.length).toBeGreaterThan(0);
  });
});
