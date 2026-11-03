import { Ball } from './ball.js';
import { CONFIG } from '../config.js';

export class PhysicsWorld {
  constructor() {
    this.width = 1200;
    this.height = 800;
    this.balls = [];
    this.pointers = new Map(); // id -> { x, y, px, py, isDown }

    // Spatial hash grid
    this.cellSize = 80;
    this.grid = new Map();

    // Timing accumulator for fixed timestep
    this.accumulator = 0;
    this.fixedDt = 1 / CONFIG.physics.hz;
  }

  resize(w, h) {
    this.width = Math.max(300, w);
    this.height = Math.max(300, h);
    this.cellSize = Math.max(60, Math.floor(Math.min(w, h) / 10));

    // Clamp balls inside new boundaries
    for (const b of this.balls) {
      b.x = Math.max(b.radius, Math.min(this.width - b.radius, b.x));
      b.y = Math.max(b.radius, Math.min(this.height - b.radius, b.y));
    }
  }

  setBallCount(count, radius = null) {
    const target = Math.max(CONFIG.balls.min, Math.min(CONFIG.balls.max, count));

    // Calculate responsive radius based on screen dimensions and ball count
    const defaultR = radius || Math.max(16, Math.min(48, Math.floor(Math.min(this.width, this.height) / (Math.sqrt(target) * 2.8))));

    while (this.balls.length < target) {
      const id = this.balls.length;
      const x = defaultR + Math.random() * (this.width - defaultR * 2);
      const y = defaultR + Math.random() * (this.height * 0.7);
      const ball = new Ball(x, y, defaultR, id);
      this.balls.push(ball);
    }

    if (this.balls.length > target) {
      this.balls.length = target;
    }

    for (const b of this.balls) {
      b.radius = defaultR;
    }
  }

  /**
   * Classic bouncy balls voice impulse (breaktime mode) — strong high leaps!
   */
  bounceBalls(impulseMagnitude) {
    if (impulseMagnitude <= 0) return;
    for (const b of this.balls) {
      const upward = -impulseMagnitude * (0.95 + Math.random() * 0.55);
      const horizontal = (Math.random() - 0.5) * impulseMagnitude * 0.75;
      b.applyImpulse(horizontal, upward);
      b.angularVelocity += (Math.random() - 0.5) * 7.0;
      b.triggerSquash(0, 1, Math.min(8, impulseMagnitude * 0.35));
    }
  }

  /**
   * Subtle voice pulse when sound starts rising above ambient floor before yellow zone.
   */
  voicePulse(progress) {
    const factor = Math.max(0, progress - 0.25);
    if (factor <= 0) return;
    for (const b of this.balls) {
      if (b.y >= this.height - b.radius * 2.4 && Math.random() < 0.08) {
        const hop = (1.8 + Math.random() * 2.8) * factor;
        const jitterX = (Math.random() - 0.5) * 2.2 * factor;
        b.applyImpulse(jitterX, -hop);
        b.triggerSquash(0, 1, hop * 0.6);
      }
    }
  }

  /**
   * Yellow Zone voice stirring: balls visibly jump and jostle, showing clear reactivity to chatter!
   * @param {number} intensity 0.0 .. 1.5
   */
  stirBalls(intensity) {
    const factor = Math.min(1.5, Math.max(0.35, intensity));
    for (const b of this.balls) {
      // Affect balls in the lower third of the screen
      if (b.y >= this.height - b.radius * 4.0) {
        if (Math.random() < 0.28) {
          const hop = (5.0 + Math.random() * 8.5) * factor;
          const jitterX = (Math.random() - 0.5) * 6.5 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 6.0 * factor;
          b.triggerSquash(0, 1, hop * 0.65);
        }
      }
    }
  }

  /**
   * Red Zone scare hop: sudden noise shock launches all balls high up across the screen!
   */
  scareBounce(intensity = 1.0) {
    const mag = Math.min(42, 22 * intensity);
    for (const b of this.balls) {
      const upward = -mag * (0.9 + Math.random() * 0.55);
      const horizontal = (Math.random() - 0.5) * mag * 0.9;
      b.applyImpulse(horizontal, upward);
      b.angularVelocity += (Math.random() - 0.5) * 14.0;
      b.triggerSquash(0, 1, 6.0);
    }
  }

  /**
   * Ongoing chaos in Red Zone during sustained noise:
   * Keeps balls vigorously flying, bouncing, and colliding until the room quiets down.
   */
  chaosAgitate(intensity = 1.0) {
    const factor = Math.min(1.8, Math.max(0.5, intensity));
    for (const b of this.balls) {
      if (b.y >= this.height - b.radius * 6.0) {
        if (Math.random() < 0.42) {
          const hop = (8.5 + Math.random() * 14.5) * factor;
          const jitterX = (Math.random() - 0.5) * 11.0 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 9.0 * factor;
          b.triggerSquash(0, 1, 4.0);
        }
      }
    }
  }

  update(dt, zone = 'green', isGolden = false) {
    // Accumulate time for fixed 60Hz physics step
    this.accumulator += Math.min(0.1, dt);

    while (this.accumulator >= this.fixedDt) {
      this.stepFixed(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Update animations (squash recovery, breathing, blinking, roly-poly angle)
    for (const b of this.balls) {
      b.updateAnimation(dt, zone, isGolden);
    }
  }

  stepFixed(dt) {
    const { gravity, friction, restitution } = CONFIG.physics;
    const subSteps = CONFIG.physics.subSteps;

    for (let step = 0; step < subSteps; step++) {
      // 1. Verlet Integration & Pointer Dragging
      for (const b of this.balls) {
        if (b.isDragged && b.pointerId !== null) {
          const ptr = this.pointers.get(b.pointerId);
          if (ptr && ptr.isDown) {
            b.px = b.x;
            b.py = b.y;
            b.x = ptr.x;
            b.y = ptr.y;
            continue;
          } else {
            b.isDragged = false;
            b.pointerId = null;
          }
        }

        const vx = (b.x - b.px) * friction;
        const vy = (b.y - b.py) * friction + gravity;

        b.px = b.x;
        b.py = b.y;
        b.x += vx;
        b.y += vy;

        // Roly-poly tilt reaction from rolling movement
        b.angularVelocity += (vx / b.radius) * 1.8;
      }

      // 2. Wall Collisions
      for (const b of this.balls) {
        if (b.isDragged) continue;

        // Floor
        if (b.y > this.height - b.radius) {
          const vy = b.y - b.py;
          b.y = this.height - b.radius;
          b.py = b.y + vy * restitution;
          if (Math.abs(vy) > 1.5) {
            b.triggerSquash(0, 1, vy);
          }
        }
        // Ceiling
        if (b.y < b.radius) {
          const vy = b.y - b.py;
          b.y = b.radius;
          b.py = b.y + vy * restitution;
          if (Math.abs(vy) > 1.5) {
            b.triggerSquash(0, -1, vy);
          }
        }
        // Left wall
        if (b.x < b.radius) {
          const vx = b.x - b.px;
          b.x = b.radius;
          b.px = b.x + vx * restitution;
          if (Math.abs(vx) > 1.5) {
            b.triggerSquash(-1, 0, vx);
          }
        }
        // Right wall
        if (b.x > this.width - b.radius) {
          const vx = b.x - b.px;
          b.x = this.width - b.radius;
          b.px = b.x + vx * restitution;
          if (Math.abs(vx) > 1.5) {
            b.triggerSquash(1, 0, vx);
          }
        }
      }

      // 3. Ball-to-ball collisions using Spatial Hash
      this.resolveBallCollisions();
    }
  }

  resolveBallCollisions() {
    this.grid.clear();

    // Populate spatial hash
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      const cellX = Math.floor(b.x / this.cellSize);
      const cellY = Math.floor(b.y / this.cellSize);
      const key = `${cellX},${cellY}`;

      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(b);
    }

    // Check neighboring cells
    for (const b1 of this.balls) {
      const cx = Math.floor(b1.x / this.cellSize);
      const cy = Math.floor(b1.y / this.cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const neighborKey = `${cx + ox},${cy + oy}`;
          const cell = this.grid.get(neighborKey);
          if (!cell) continue;

          for (const b2 of cell) {
            if (b1.id >= b2.id) continue; // Check pair only once

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const minDist = b1.radius + b2.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;

              if (!b1.isDragged) {
                b1.x -= nx * overlap;
                b1.y -= ny * overlap;
              }
              if (!b2.isDragged) {
                b2.x += nx * overlap;
                b2.y += ny * overlap;
              }

              // Light squishing on hard ball collisions
              const relSpeed = Math.abs((b1.x - b1.px) - (b2.x - b2.px)) + Math.abs((b1.y - b1.py) - (b2.y - b2.py));
              if (relSpeed > 3) {
                b1.triggerSquash(-nx, -ny, relSpeed * 0.35);
                b2.triggerSquash(nx, ny, relSpeed * 0.35);
                b1.angularVelocity += (Math.random() - 0.5) * relSpeed * 0.45;
                b2.angularVelocity += (Math.random() - 0.5) * relSpeed * 0.45;
              }
            }
          }
        }
      }
    }
  }

  // Pointer interaction
  onPointerDown(id, x, y) {
    this.pointers.set(id, { x, y, px: x, py: y, isDown: true });

    // Check hit test against balls (check front-to-back)
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) {
        b.isDragged = true;
        b.pointerId = id;
        return b; // returns touched ball (e.g. to pop if bubble)
      }
    }
    return null;
  }

  onPointerMove(id, x, y) {
    const ptr = this.pointers.get(id);
    if (ptr) {
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.x = x;
      ptr.y = y;
    }
  }

  onPointerUp(id) {
    const ptr = this.pointers.get(id);
    if (ptr) {
      ptr.isDown = false;
      const vx = ptr.x - ptr.px;
      const vy = ptr.y - ptr.py;

      // Release dragged ball with throw velocity
      for (const b of this.balls) {
        if (b.pointerId === id) {
          b.isDragged = false;
          b.pointerId = null;
          // Apply release throw impulse
          b.px = b.x - vx * 1.2;
          b.py = b.y - vy * 1.2;
        }
      }
      this.pointers.delete(id);
    }
  }
}
