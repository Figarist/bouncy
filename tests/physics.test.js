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
    const moved = world.balls.some((b) => Math.abs(b.y - b.py) > 0.1 || Math.abs(b.x - b.px) > 0.1);
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

    const upwardBalls = world.balls.filter((b) => b.y - b.py < -1.0);
    expect(upwardBalls.length).toBeGreaterThan(0);
  });

  it('setBallScale scales radii from 0.2x to 2.0x max and adapts cellSize without injecting phantom velocity', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(20);

    const baseRadius = world.balls[0].radius;

    // Settle all balls on the floor at rest
    for (const b of world.balls) {
      b.y = 800 - b.radius;
      b.py = b.y;
      b.x = 500;
      b.px = 500;
    }

    world.setBallScale(0.2);
    expect(world.balls[0].radius).toBe(Math.max(6, Math.round(baseRadius * 0.2)));

    world.setBallScale(2.0);
    expect(world.balls[0].radius).toBe(Math.round(baseRadius * 2.0));
    expect(world.cellSize).toBeGreaterThanOrEqual(world.balls[0].radius * 2.0);

    // Changing scale on resting balls must NOT inject phantom upward velocity
    for (const b of world.balls) {
      expect(Math.abs(b.y - b.py)).toBeLessThan(0.01);
      expect(Math.abs(b.x - b.px)).toBeLessThan(0.01);
    }

    // Test bounds clamping: > 2.0 must clamp strictly to 2.0
    world.setBallScale(4.0);
    expect(world.ballScale).toBe(2.0);
  });

  it('prevents infinite bounce when scaling up a dense pile of balls', () => {
    const world = new PhysicsWorld();
    world.resize(800, 600);
    world.setBallCount(60);

    // Scale up to 2.0x while balls are packed near the floor
    for (let i = 0; i < world.balls.length; i++) {
      const b = world.balls[i];
      b.x = 200 + (i % 10) * 18;
      b.px = b.x;
      b.y = 560 - Math.floor(i / 10) * 18;
      b.py = b.y;
    }

    world.setBallScale(2.0);

    // Run 3 seconds of simulation in quiet mode; balls must settle to rest, not bounce infinitely
    for (let i = 0; i < 180; i++) {
      world.update(1 / 60, 'green', false);
    }

    const maxSpeed = Math.max(...world.balls.map((b) => Math.hypot(b.x - b.px, b.y - b.py)));
    expect(maxSpeed).toBeLessThan(2.0);
  });

  it('rightWallObstacle restricts arena and pushes balls leftward with velocity', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(10);

    const b = world.balls[0];
    b.x = 900;
    b.px = 900;
    b.y = 400;
    b.py = 400;

    // Panel slides in to x = 800 with negative velocity (moving left)
    world.setRightWallObstacle({ x: 800, vx: -250 });
    world.stepFixed(1 / 60);

    // Ball should be clamped to 800 - radius and have leftward velocity (px > x)
    expect(b.x).toBeLessThanOrEqual(800 - b.radius);
    expect(b.x - b.px).toBeLessThan(0); // moving leftwards!
  });

  it('sidebarObstacle deflects balls and cubes colliding with its rectangle and prevents wall-pinch', () => {
    const world = new PhysicsWorld();
    world.resize(1000, 800);
    world.setBallCount(1);

    const b = world.balls[0];
    b.x = 250;
    b.px = 250;
    b.y = 200;
    b.py = 200;

    // Place sidebar obstacle from x: 200 to 400, y: 150 to 350
    world.setSidebarObstacle({
      left: 200,
      top: 150,
      right: 400,
      bottom: 350,
      vx: -20,
      vy: 0,
      isMoving: true,
    });

    world.stepFixed(1 / 60);

    // The ball should have been pushed out of the obstacle bounds
    const inside = b.x > 200 && b.x < 400 && b.y > 150 && b.y < 350;
    expect(inside).toBe(false);

    // Verify blocky theme ('craft') also collides accurately with its rotated rounded-box extent
    world.setTheme('craft');
    b.angle = 0;
    b.x = 300;
    b.px = 300;
    b.y = 140;
    b.py = 132; // falling downward onto top of sidebar (y = 150)

    world.stepFixed(1 / 60);
    const ext = world.getBallExtent(b);
    expect(b.y).toBeLessThanOrEqual(150 - ext + 0.01);
    expect(b.y - b.py).toBeLessThan(0); // bounced upward off top of stationary/moving sidebar!
  });
});
