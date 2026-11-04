import { Ball } from './ball.js';
import { CONFIG } from '../config.js';

const MAX_SUBSTEP_SPEED = 24;
const RESTING_VELOCITY_THRESHOLD = 0.65;
// Spatial hash cell per ball radius: two touching rotated cubes reach 2 × ~1.18R apart, so cells
// must cover 2.36R or neighbouring pairs get missed at large ball scales.
const CELL_SIZE_PER_RADIUS = 2.4;
// Sidebar moves farther than this in one frame only when it jumps (restore, collapse), never when dragged.
const SIDEBAR_TELEPORT_PX = 200;

export class PhysicsWorld {
  constructor() {
    this.width = 1200;
    this.height = 800;
    this.balls = [];
    this.pointers = new Map(); // id -> { x, y, px, py, isDown }

    // Spatial hash grid
    this.cellSize = 80;
    this.grid = new Map();

    // Scale & dynamic radius (0.2x .. 2.0x)
    this.ballScale = 1.0;
    this.targetCount = CONFIG.balls.default;
    this.theme = 'critters';

    // Dynamic UI Obstacles (moving sidebar and sliding settings panel)
    this.sidebarObstacle = null;
    this.prevSidebarRect = null;
    this.rightWallObstacle = null;

    // Timing accumulator for fixed timestep
    this.accumulator = 0;
    this.fixedDt = 1 / CONFIG.physics.hz;
  }

  get isBoxTheme() {
    return this.theme === 'craft' || this.theme === 'blox';
  }

  setTheme(themeName) {
    this.theme = themeName || 'critters';
  }

  /**
   * Effective collision half-extent for a ball or rotated rounded cube.
   * For blocky themes ('craft', 'blox'), uses the exact support function of a
   * rotated rounded square so flat faces rest flush and tilted corners collide accurately.
   */
  getBallExtent(b) {
    if (!this.isBoxTheme) return b.radius;
    const innerHalf = b.radius * 0.65;
    const cornerR = b.radius * 0.26;
    const a = b.angle || 0;
    return innerHalf * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) + cornerR;
  }

  resize(w, h) {
    this.width = Math.max(300, w);
    this.height = Math.max(300, h);
    this.updateBallRadii();
  }

  calcBaseRadius(target = this.targetCount) {
    const count = Math.max(CONFIG.balls.min, Math.min(CONFIG.balls.max, target));
    return Math.max(16, Math.min(48, Math.floor(Math.min(this.width, this.height) / (Math.sqrt(count) * 2.8))));
  }

  setBallScale(scale) {
    const parsed = Number(scale);
    const clean = !Number.isNaN(parsed) && parsed > 0 ? Math.round(parsed * 10) / 10 : 1.0;
    this.ballScale = Math.max(0.2, Math.min(2.0, clean));
    this.updateBallRadii();
  }

  updateBallRadii() {
    const baseR = this.calcBaseRadius(this.targetCount);
    const effectiveR = Math.max(6, Math.round(baseR * this.ballScale));

    this.cellSize = Math.max(70, Math.ceil(effectiveR * CELL_SIZE_PER_RADIUS));

    const effectiveRight = this.rightWallObstacle && typeof this.rightWallObstacle.x === 'number'
      ? Math.max(120, Math.min(this.width, this.rightWallObstacle.x))
      : this.width;

    for (const b of this.balls) {
      // Preserve and gently damp current Verlet velocity so clamping positions never injects phantom energy
      const vx = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, (b.x - b.px) * 0.4));
      const vy = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, (b.y - b.py) * 0.4));

      b.radius = effectiveR;
      b.resetSquash();

      const ext = this.getBallExtent(b);
      b.x = Math.max(ext, Math.min(effectiveRight - ext, b.x));
      b.y = Math.max(ext, Math.min(this.height - ext, b.y));

      // Push out of sidebar obstacle if overlapping after scale change
      if (this.sidebarObstacle) {
        this.ejectFromSidebarStatic(b, this.sidebarObstacle, ext, effectiveRight);
      }

      b.px = b.x - vx;
      b.py = b.y - vy;
    }
  }

  setSidebarObstacle(obstacle) {
    if (!obstacle) {
      this.sidebarObstacle = null;
      this.prevSidebarRect = null;
      return;
    }
    this.sidebarObstacle = obstacle;
  }

  setRightWallObstacle(obstacle) {
    this.rightWallObstacle = obstacle;
  }

  setBallCount(count, radius = null) {
    const target = Math.max(CONFIG.balls.min, Math.min(CONFIG.balls.max, count));
    this.targetCount = target;

    const effectiveR = radius || Math.max(6, Math.round(this.calcBaseRadius(target) * this.ballScale));
    this.cellSize = Math.max(70, Math.ceil(effectiveR * CELL_SIZE_PER_RADIUS));

    const effectiveRight = this.rightWallObstacle && typeof this.rightWallObstacle.x === 'number'
      ? Math.max(120, Math.min(this.width, this.rightWallObstacle.x))
      : this.width;

    while (this.balls.length < target) {
      const id = this.balls.length;
      const pos = this.findSafeSpawnPosition(effectiveR, effectiveRight);
      const ball = new Ball(pos.x, pos.y, effectiveR, id);
      this.balls.push(ball);
    }

    if (this.balls.length > target) {
      this.balls.length = target;
    }

    for (const b of this.balls) {
      const vx = b.x - b.px;
      const vy = b.y - b.py;
      b.radius = effectiveR;
      const ext = this.getBallExtent(b);
      b.x = Math.max(ext, Math.min(effectiveRight - ext, b.x));
      b.y = Math.max(ext, Math.min(this.height - ext, b.y));
      b.px = b.x - vx;
      b.py = b.y - vy;
    }
  }

  findSafeSpawnPosition(r, effectiveRight) {
    const minX = r;
    const maxX = Math.max(minX + 1, effectiveRight - r);
    const minY = r;
    const maxY = Math.max(minY + 1, this.height * 0.72);
    const obs = this.sidebarObstacle;

    for (let attempt = 0; attempt < 15; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      if (!obs) return { x, y };

      const pad = r + 6;
      const inBox = x > obs.left - pad && x < obs.right + pad && y > obs.top - pad && y < obs.bottom + pad;
      const inLeftPinch = obs.left < r * 2.2 && x < obs.right + pad && y > obs.top - pad && y < obs.bottom + pad;
      if (!inBox && !inLeftPinch) {
        return { x, y };
      }
    }

    if (obs && obs.right + r + 10 < maxX) {
      return {
        x: obs.right + r + 10 + Math.random() * Math.max(10, maxX - (obs.right + r + 10)),
        y: minY + Math.random() * (maxY - minY),
      };
    }
    return {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
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
      b.angularVelocity += (Math.random() - 0.5) * 6.0;
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
      if (b.y >= this.height - b.radius * 4.0) {
        if (Math.random() < 0.28) {
          const hop = (5.0 + Math.random() * 8.5) * factor;
          const jitterX = (Math.random() - 0.5) * 6.5 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 5.0 * factor;
          b.triggerSquash(0, 1, hop * 0.65);
        }
      }
    }
  }

  /**
   * Red Zone scare hop: sudden noise shock launches all balls high up across the screen!
   */
  scareBounce(intensity = 1.0) {
    const mag = Math.min(36, 20 * intensity);
    for (const b of this.balls) {
      const upward = -mag * (0.9 + Math.random() * 0.5);
      const horizontal = (Math.random() - 0.5) * mag * 0.85;
      b.applyImpulse(horizontal, upward);
      b.angularVelocity += (Math.random() - 0.5) * 11.0;
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
          const hop = (8.0 + Math.random() * 13.0) * factor;
          const jitterX = (Math.random() - 0.5) * 10.0 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 7.5 * factor;
          b.triggerSquash(0, 1, 4.0);
        }
      }
    }
  }

  update(dt, zone = 'green', isGolden = false) {
    this.accumulator += Math.min(0.1, dt);

    while (this.accumulator >= this.fixedDt) {
      this.stepFixed(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    const isBox = this.isBoxTheme;
    for (const b of this.balls) {
      b.updateAnimation(dt, zone, isGolden, isBox);
    }
  }

  stepFixed() {
    const { gravity, friction, restitution } = CONFIG.physics;
    const subSteps = CONFIG.physics.subSteps;
    const isBox = this.isBoxTheme;

    const effectiveRight = this.rightWallObstacle && typeof this.rightWallObstacle.x === 'number'
      ? Math.max(100, Math.min(this.width, this.rightWallObstacle.x))
      : this.width;

    const rawRightWallVx = this.rightWallObstacle?.vx || 0;
    const rightWallSubVx = Math.max(
      -16,
      Math.min(16, Math.abs(rawRightWallVx) > 25 ? rawRightWallVx / (CONFIG.physics.hz * subSteps) : rawRightWallVx / subSteps)
    );

    const obsEnd = this.sidebarObstacle;
    // A collapse/expand or a restored position changes the rect in one frame: that is a teleport,
    // not motion, so it must not shove nearby balls at full speed.
    const prev = this.prevSidebarRect;
    const teleported = prev && obsEnd && (
      Math.abs((obsEnd.right - obsEnd.left) - (prev.right - prev.left)) > 1 ||
      Math.abs((obsEnd.bottom - obsEnd.top) - (prev.bottom - prev.top)) > 1 ||
      Math.hypot(obsEnd.left - prev.left, obsEnd.top - prev.top) > SIDEBAR_TELEPORT_PX
    );
    const obsStart = (!teleported && prev) || obsEnd;

    // Compute per-substep sidebar velocity in Verlet substep units (px / substep)
    let sidebarSubVx = 0;
    let sidebarSubVy = 0;
    if (obsEnd) {
      if (teleported) {
        // no carry-over velocity
      } else if (prev) {
        const dxCenter = ((obsEnd.left + obsEnd.right) - (obsStart.left + obsStart.right)) * 0.5;
        const dyCenter = ((obsEnd.top + obsEnd.bottom) - (obsStart.top + obsStart.bottom)) * 0.5;
        sidebarSubVx = dxCenter / subSteps;
        sidebarSubVy = dyCenter / subSteps;
      } else if (obsEnd.vx || obsEnd.vy) {
        const rvx = obsEnd.vx || 0;
        const rvy = obsEnd.vy || 0;
        sidebarSubVx = Math.abs(rvx) > 25 ? rvx / (CONFIG.physics.hz * subSteps) : rvx / subSteps;
        sidebarSubVy = Math.abs(rvy) > 25 ? rvy / (CONFIG.physics.hz * subSteps) : rvy / subSteps;
      }
      sidebarSubVx = Math.max(-16, Math.min(16, sidebarSubVx));
      sidebarSubVy = Math.max(-16, Math.min(16, sidebarSubVy));
    }

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

        let vx = (b.x - b.px) * friction;
        let vy = (b.y - b.py) * friction + gravity;

        // Clamp velocity to prevent tunneling or energy explosion
        if (vx > MAX_SUBSTEP_SPEED) vx = MAX_SUBSTEP_SPEED;
        else if (vx < -MAX_SUBSTEP_SPEED) vx = -MAX_SUBSTEP_SPEED;
        if (vy > MAX_SUBSTEP_SPEED) vy = MAX_SUBSTEP_SPEED;
        else if (vy < -MAX_SUBSTEP_SPEED) vy = -MAX_SUBSTEP_SPEED;

        b.px = b.x;
        b.py = b.y;
        b.x += vx;
        b.y += vy;

        // Roly-poly tilt reaction from horizontal rolling movement
        if (Math.abs(vx) > 0.08) {
          b.angularVelocity += (vx / b.radius) * (isBox ? 1.0 : 1.5);
        }
      }

      // Interpolate sidebar rect for this substep
      let stepObs = null;
      if (obsEnd) {
        const t = (step + 1) / subSteps;
        stepObs = {
          left: obsStart.left + (obsEnd.left - obsStart.left) * t,
          top: obsStart.top + (obsEnd.top - obsStart.top) * t,
          right: obsStart.right + (obsEnd.right - obsStart.right) * t,
          bottom: obsStart.bottom + (obsEnd.bottom - obsStart.bottom) * t,
        };
      }

      // 2. Pre-solve Arena Walls & Obstacles so floor/sidebar act as solid ground before ball-to-ball solver
      this.resolveBoundariesAndObstacles(stepObs, sidebarSubVx, sidebarSubVy, effectiveRight, rightWallSubVx, restitution, isBox);

      // 3. Ball-to-Ball Collisions
      this.resolveBallCollisions();

      // 4. Post-solve clamp to ensure ball-to-ball pushes never leave any ball penetrating walls or obstacles
      this.resolveBoundariesAndObstacles(stepObs, sidebarSubVx, sidebarSubVy, effectiveRight, rightWallSubVx, restitution, isBox);
    }

    if (obsEnd) {
      this.prevSidebarRect = {
        left: obsEnd.left,
        top: obsEnd.top,
        right: obsEnd.right,
        bottom: obsEnd.bottom,
      };
    } else {
      this.prevSidebarRect = null;
    }
  }

  resolveBoundariesAndObstacles(stepObs, sidebarSubVx, sidebarSubVy, effectiveRight, rightWallSubVx, restitution, isBox) {
    for (const b of this.balls) {
      if (b.isDragged) continue;

      const ext = this.getBallExtent(b);

      // Sidebar Rectangular/Rounded Obstacle Collision
      if (stepObs) {
        this.resolveSidebarCollision(b, stepObs, sidebarSubVx, sidebarSubVy, ext, effectiveRight, restitution);
      }

      // Floor
      if (b.y > this.height - ext) {
        const vx = b.x - b.px;
        const vy = b.y - b.py;
        b.y = this.height - ext;

        if (vy > 0) {
          const effRest = vy > RESTING_VELOCITY_THRESHOLD ? restitution : 0;
          const newVy = -vy * effRest;
          const floorFriction = isBox ? 0.88 : 0.975;
          const newVx = Math.abs(vx) < 0.04 && effRest === 0 ? 0 : vx * floorFriction;

          b.py = b.y - newVy;
          b.px = b.x - newVx;

          if (isBox) {
            b.angularVelocity -= b.angle * 4.5;
            if (effRest === 0) b.angularVelocity *= 0.65;
          }
          if (vy > 1.8) {
            b.triggerSquash(0, 1, vy);
          }
        } else {
          b.py = b.y - vy;
        }
      }

      // Ceiling
      if (b.y < ext) {
        const vy = b.y - b.py;
        b.y = ext;
        if (vy < 0) {
          b.py = b.y - (-vy * restitution);
          if (-vy > 1.8) {
            b.triggerSquash(0, -1, -vy);
          }
        } else {
          b.py = b.y - vy;
        }
      }

      // Left wall
      if (b.x < ext) {
        const vx = b.x - b.px;
        b.x = ext;
        if (vx < 0) {
          b.px = b.x - (-vx * restitution);
          if (-vx > 1.8) {
            b.triggerSquash(-1, 0, -vx);
          }
        } else {
          b.px = b.x - vx;
        }
      }

      // Dynamic Right wall (canvas edge or sliding Settings Panel)
      if (b.x > effectiveRight - ext) {
        const vx = b.x - b.px;
        b.x = effectiveRight - ext;

        if (rightWallSubVx < -0.15) {
          const punch = Math.min(15, Math.abs(rightWallSubVx) * 1.6 + Math.max(0, vx) * restitution + 3.5);
          b.px = b.x + punch;
          b.angularVelocity += (Math.random() - 0.5) * 6.0;
          b.triggerSquash(-1, 0, punch * 1.5);
        } else if (vx > 0) {
          b.px = b.x - (-vx * restitution);
          if (vx > 1.8) {
            b.triggerSquash(1, 0, vx);
          }
        } else {
          b.px = b.x - vx;
        }
      }
    }
  }

  /**
   * Resolves collision between a ball/cube and the floating 'Мої класи' window.
   * Uses a rounded-rectangle Minkowski collider (matching CSS border-radius: 20px),
   * accurate substep velocity transfer, tangential friction, and anti-pinch wall escape.
   */
  resolveSidebarCollision(b, obs, ovx, ovy, ext, effectiveRight, restitution) {
    const w = obs.right - obs.left;
    const h = obs.bottom - obs.top;
    if (w <= 4 || h <= 4) return;

    const cornerR = Math.min(20, w * 0.25, h * 0.25);
    const inLeft = obs.left + cornerR;
    const inRight = obs.right - cornerR;
    const inTop = obs.top + cornerR;
    const inBottom = obs.bottom - cornerR;

    const cx = Math.max(inLeft, Math.min(inRight, b.x));
    const cy = Math.max(inTop, Math.min(inBottom, b.y));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const distSq = dx * dx + dy * dy;
    const totalR = ext + cornerR;

    if (distSq >= totalR * totalR) return;

    // Read pre-collision velocity BEFORE modifying position
    const vx = b.x - b.px;
    const vy = b.y - b.py;

    // Detect if the gap between the sidebar and any arena wall is too narrow for the ball to fit
    const pinchMargin = ext * 2.1;
    const pinchedLeft = obs.left < pinchMargin;
    const pinchedRight = (effectiveRight - obs.right) < pinchMargin;
    const pinchedTop = obs.top < pinchMargin;
    const pinchedBottom = (this.height - obs.bottom) < pinchMargin;

    const dist = Math.sqrt(distSq);
    let nx = 0;
    let ny = -1;
    let penetration = totalR;

    const isInsideOuter = b.x >= obs.left && b.x <= obs.right && b.y >= obs.top && b.y <= obs.bottom;

    if (dist > 1e-4 && !isInsideOuter) {
      nx = dx / dist;
      ny = dy / dist;
      penetration = totalR - dist;

      // If normal pushes the ball into a pinched wall gap, redirect escape to nearest open side
      if (
        (nx < -0.3 && pinchedLeft) ||
        (nx > 0.3 && pinchedRight) ||
        (ny < -0.3 && pinchedTop) ||
        (ny > 0.3 && pinchedBottom)
      ) {
        const esc = this.computeUnpinchedEscape(b, obs, ext, pinchedLeft, pinchedRight, pinchedTop, pinchedBottom);
        nx = esc.nx;
        ny = esc.ny;
        penetration = esc.penetration;
      }
    } else {
      const esc = this.computeUnpinchedEscape(b, obs, ext, pinchedLeft, pinchedRight, pinchedTop, pinchedBottom);
      nx = esc.nx;
      ny = esc.ny;
      penetration = esc.penetration;
    }

    // Push ball out of the sidebar
    b.x += nx * penetration;
    b.y += ny * penetration;

    // Relative velocity in substep units
    const relVx = vx - ovx;
    const relVy = vy - ovy;
    const normalVel = relVx * nx + relVy * ny;

    const tx = -ny;
    const ty = nx;
    const tangentVel = relVx * tx + relVy * ty;

    const obsPushNormal = ovx * nx + ovy * ny;

    if (normalVel < 0 || obsPushNormal > 0.1) {
      const impact = Math.max(0, -normalVel);
      const isRestingOnTop = ny < -0.6 && impact < RESTING_VELOCITY_THRESHOLD && Math.abs(ovy) < 0.15;
      const effRest = isRestingOnTop ? 0 : restitution;

      let outNormalRel = impact * effRest;
      if (obsPushNormal > 0.15) {
        outNormalRel = Math.max(outNormalRel, obsPushNormal * 0.55 + 1.2);
      }

      const tangentFriction = this.isBoxTheme ? (isRestingOnTop ? 0.78 : 0.86) : (isRestingOnTop ? 0.92 : 0.96);
      const outTangentRel = Math.abs(tangentVel) < 0.03 && isRestingOnTop ? 0 : tangentVel * tangentFriction;

      const newVx = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, ovx + nx * outNormalRel + tx * outTangentRel));
      const newVy = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, ovy + ny * outNormalRel + ty * outTangentRel));

      b.px = b.x - newVx;
      b.py = b.y - newVy;

      // Spin transfer from tangential slide & moving window
      b.angularVelocity += (outTangentRel / b.radius) * (this.isBoxTheme ? 0.65 : 1.2);
      if (this.isBoxTheme && Math.abs(ny) > 0.65) {
        b.angularVelocity -= b.angle * 5.0;
        if (isRestingOnTop) b.angularVelocity *= 0.65;
      }

      const squashMag = impact + Math.max(0, obsPushNormal) * 1.4;
      if (squashMag > 1.6) {
        b.triggerSquash(nx, ny, squashMag * 1.25);
      }
    } else {
      b.px = b.x - vx;
      b.py = b.y - vy;
    }
  }

  computeUnpinchedEscape(b, obs, ext, pinchedLeft, pinchedRight, pinchedTop, pinchedBottom) {
    const dL = pinchedLeft ? Infinity : (b.x - obs.left) + ext;
    const dR = pinchedRight ? Infinity : (obs.right - b.x) + ext;
    const dT = pinchedTop ? Infinity : (b.y - obs.top) + ext;
    const dB = pinchedBottom ? Infinity : (obs.bottom - b.y) + ext;

    const minD = Math.min(dL, dR, dT, dB);
    if (minD === dT) return { nx: 0, ny: -1, penetration: Math.max(0, dT) };
    if (minD === dR) return { nx: 1, ny: 0, penetration: Math.max(0, dR) };
    if (minD === dB) return { nx: 0, ny: 1, penetration: Math.max(0, dB) };
    if (minD === dL) return { nx: -1, ny: 0, penetration: Math.max(0, dL) };

    return { nx: 1, ny: 0, penetration: Math.max(0, (obs.right - b.x) + ext) };
  }

  ejectFromSidebarStatic(b, obs, ext, effectiveRight) {
    if (b.x + ext <= obs.left || b.x - ext >= obs.right || b.y + ext <= obs.top || b.y - ext >= obs.bottom) {
      return;
    }
    const pinchMargin = ext * 2.1;
    const esc = this.computeUnpinchedEscape(
      b,
      obs,
      ext,
      obs.left < pinchMargin,
      (effectiveRight - obs.right) < pinchMargin,
      obs.top < pinchMargin,
      (this.height - obs.bottom) < pinchMargin
    );
    b.x += esc.nx * esc.penetration;
    b.y += esc.ny * esc.penetration;
  }

  resolveBallCollisions() {
    this.grid.clear();

    // Process bottom-up by Y so floor support propagates cleanly up through stacks
    if (!this.sortedBalls) this.sortedBalls = [];
    this.sortedBalls.length = this.balls.length;
    for (let i = 0; i < this.balls.length; i++) {
      this.sortedBalls[i] = this.balls[i];
    }
    this.sortedBalls.sort((a, b) => b.y - a.y);

    // Populate spatial hash and record bottom-up rank
    for (let i = 0; i < this.sortedBalls.length; i++) {
      const b = this.sortedBalls[i];
      b._rank = i;
      const cellX = Math.floor(b.x / this.cellSize);
      const cellY = Math.floor(b.y / this.cellSize);
      const key = `${cellX},${cellY}`;

      let bucket = this.grid.get(key);
      if (!bucket) {
        bucket = [];
        this.grid.set(key, bucket);
      }
      bucket.push(b);
    }

    const isBox = this.isBoxTheme;

    // Check neighboring cells bottom-up (b1 is always lower or equal to b2)
    for (let i = 0; i < this.sortedBalls.length; i++) {
      const b1 = this.sortedBalls[i];
      const cx = Math.floor(b1.x / this.cellSize);
      const cy = Math.floor(b1.y / this.cellSize);
      const ext1 = this.getBallExtent(b1);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const neighborKey = `${cx + ox},${cy + oy}`;
          const cell = this.grid.get(neighborKey);
          if (!cell) continue;

          for (let j = 0; j < cell.length; j++) {
            const b2 = cell[j];
            if (b1._rank >= b2._rank) continue; // Check each pair once, strictly bottom-up

            let dx = b2.x - b1.x;
            let dy = b2.y - b1.y;
            const ext2 = this.getBallExtent(b2);
            const minDist = ext1 + ext2;
            let distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist) {
              // Break artificial vertical symmetry so vertical columns buckle naturally into stable hex packing
              if (Math.abs(dx) < 0.05) {
                dx = ((b1.id + b2.id) % 2 === 0 ? 1 : -1) * 0.25;
                distSq = dx * dx + dy * dy;
              }

              // Capture true pre-collision velocities BEFORE modifying positions
              const v1x = b1.x - b1.px;
              const v1y = b1.y - b1.py;
              const v2x = b2.x - b2.px;
              const v2y = b2.y - b2.py;

              let dist = Math.sqrt(distSq);
              let nx;
              let ny;
              if (dist > 0.001) {
                nx = dx / dist;
                ny = dy / dist;
              } else {
                const angle = ((b1.id * 7 + b2.id * 13) % 12) * (Math.PI / 6);
                nx = Math.cos(angle);
                ny = Math.sin(angle);
                dist = 0;
              }

              const overlap = minDist - dist;
              const separation = overlap * 0.8;

              // Check if either ball is resting on the floor so we don't push the floor ball downward
              const b1OnFloor = b1.y >= this.height - ext1 - 1.5 && ny < -0.15;
              const b2OnFloor = b2.y >= this.height - ext2 - 1.5 && ny > 0.15;

              let w1 = 0.5;
              let w2 = 0.5;
              if (b1.isDragged && !b2.isDragged) {
                w1 = 0;
                w2 = 1;
              } else if (!b1.isDragged && b2.isDragged) {
                w1 = 1;
                w2 = 0;
              } else if (b1OnFloor && !b2OnFloor) {
                w1 = 0.1;
                w2 = 0.9;
              } else if (b2OnFloor && !b1OnFloor) {
                w1 = 0.9;
                w2 = 0.1;
              }

              const move1 = separation * w1;
              const move2 = separation * w2;

              // Separate positions AND shift previous positions equally so positional push alone never injects kinetic energy
              if (move1 > 0) {
                b1.x -= nx * move1;
                b1.y -= ny * move1;
                b1.px -= nx * move1;
                b1.py -= ny * move1;
              }
              if (move2 > 0) {
                b2.x += nx * move2;
                b2.y += ny * move2;
                b2.px += nx * move2;
                b2.py += ny * move2;
              }

              // Relative velocity along normal
              const relVx = v2x - v1x;
              const relVy = v2y - v1y;
              const normalVel = relVx * nx + relVy * ny;

              if (normalVel < 0) {
                const impact = -normalVel;
                const pairRestitution = impact > 1.4 ? (isBox ? 0.35 : 0.52) : 0.0;
                const totalImpulse = (1 + pairRestitution) * impact;

                // Subtle tangential contact damping helps piles settle quickly
                const tx = -ny;
                const ty = nx;
                const tangentVel = relVx * tx + relVy * ty;
                const tangentDamp = impact <= 1.4 ? 0.35 : 0.08;
                const totalTangent = tangentVel * tangentDamp;

                if (!b1.isDragged) {
                  let nv1x = v1x - nx * (totalImpulse * w1) + tx * (totalTangent * w1);
                  let nv1y = v1y - ny * (totalImpulse * w1) + ty * (totalTangent * w1);
                  if (impact <= 1.4) {
                    nv1x *= 0.96;
                    nv1y *= 0.96;
                  }
                  nv1x = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, nv1x));
                  nv1y = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, nv1y));
                  b1.px = b1.x - nv1x;
                  b1.py = b1.y - nv1y;
                }
                if (!b2.isDragged) {
                  let nv2x = v2x + nx * (totalImpulse * w2) - tx * (totalTangent * w2);
                  let nv2y = v2y + ny * (totalImpulse * w2) - ty * (totalTangent * w2);
                  if (impact <= 1.4) {
                    nv2x *= 0.96;
                    nv2y *= 0.96;
                  }
                  nv2x = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, nv2x));
                  nv2y = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, nv2y));
                  b2.px = b2.x - nv2x;
                  b2.py = b2.y - nv2y;
                }

                // Trigger squash and spin ONLY on real impacts, never on static overlap separation
                if (impact > 2.6) {
                  const sq = impact * 0.45;
                  b1.triggerSquash(-nx, -ny, sq);
                  b2.triggerSquash(nx, ny, sq);

                  const spinImpulse = Math.max(-2.5, Math.min(2.5, (tangentVel / b1.radius) * 0.45));
                  b1.angularVelocity -= spinImpulse;
                  b2.angularVelocity += spinImpulse;
                }
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
      const vx = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, (ptr.x - ptr.px) * 0.8));
      const vy = Math.max(-MAX_SUBSTEP_SPEED, Math.min(MAX_SUBSTEP_SPEED, (ptr.y - ptr.py) * 0.8));

      // Release dragged ball with clamped throw velocity
      for (const b of this.balls) {
        if (b.pointerId === id) {
          b.isDragged = false;
          b.pointerId = null;
          b.px = b.x - vx;
          b.py = b.y - vy;
        }
      }
      this.pointers.delete(id);
    }
  }
}
