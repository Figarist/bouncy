/**
 * Individual Ball instance with Verlet kinematics, squash-and-stretch,
 * roly-poly upright spring dynamics, and mood/dream states for the classroom game.
 */

const DREAM_TYPES = ['star', 'heart', 'crown', 'moon'];

export class Ball {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} id
   */
  constructor(x, y, radius, id) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.radius = radius;
    this.id = id;

    // Roly-Poly angle: starts upright with a slight natural tilt
    this.angle = (Math.random() - 0.5) * 0.15;
    this.angularVelocity = 0;

    // Pointer interaction
    this.isDragged = false;
    this.pointerId = null;

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.squashVelocityX = 0;
    this.squashVelocityY = 0;

    // Mood state for critters / emoji
    // 'sleeping' | 'stirring' | 'chaos' | 'golden'
    this.mood = 'sleeping';
    this.blinkTimer = Math.random() * 5 + 2;
    this.isBlinking = false;
    this.breathePhase = Math.random() * Math.PI * 2;

    // Golden silence dream state (for every 3rd critter)
    this.dreamType = DREAM_TYPES[Math.floor(id / 3) % DREAM_TYPES.length];
    this.dreamPhase = Math.random() * Math.PI * 2;

    // Bubble state
    this.canPop = false;
    this.popped = false;
  }

  applyForce(fx, fy) {
    this.x += fx;
    this.y += fy;
  }

  applyImpulse(ix, iy) {
    this.px -= ix;
    this.py -= iy;
  }

  resetSquash() {
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.squashVelocityX = 0;
    this.squashVelocityY = 0;
  }

  triggerSquash(normalX, normalY, intensity) {
    const cleanIntensity = Math.abs(intensity) - 1.1;
    if (cleanIntensity <= 0) return;

    const factor = Math.min(0.28, cleanIntensity * 0.026);
    const len = Math.hypot(normalX, normalY) || 1;
    const nx = Math.abs(normalX / len);
    const ny = Math.abs(normalY / len);

    // Squash in direction of normal, stretch orthogonally
    const targetScaleX = Math.max(0.72, Math.min(1.28, 1.0 + (ny - nx) * factor));
    const targetScaleY = Math.max(0.72, Math.min(1.28, 1.0 + (nx - ny) * factor));

    // Only override if the new deformation is stronger than the current one
    if (
      Math.abs(targetScaleX - 1.0) >= Math.abs(this.scaleX - 1.0) ||
      Math.abs(targetScaleY - 1.0) >= Math.abs(this.scaleY - 1.0)
    ) {
      this.scaleX = targetScaleX;
      this.scaleY = targetScaleY;
      // Dampen existing spring velocity so repeated substep hits never accumulate energy
      this.squashVelocityX *= 0.2;
      this.squashVelocityY *= 0.2;
    }
  }

  updateAnimation(dt, zone, isGolden, isBox = false) {
    const safeDt = Math.min(0.05, Math.max(0, dt));
    this.breathePhase += safeDt * 2.0;
    this.dreamPhase += safeDt * 1.6;

    // Update mood based on zone
    if (zone === 'red') {
      this.mood = 'chaos';
    } else if (zone === 'yellow') {
      this.mood = 'stirring';
    } else if (isGolden) {
      this.mood = 'golden';
    } else {
      this.mood = 'sleeping';
    }

    // Blinking
    this.blinkTimer -= safeDt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 0.15 : Math.random() * 4 + 2.5;
    }

    // Sub-stepped semi-implicit Euler for unconditionally stable spring recovery
    const steps = Math.max(1, Math.ceil(safeDt * 120));
    const subDt = safeDt / steps;

    const spring = 150;
    const damping = 19;
    const rolySpring = isBox ? 64 : 42;
    const rolyDamping = isBox ? 13 : 8.5;

    this.angularVelocity = Math.max(-10, Math.min(10, this.angularVelocity));

    for (let i = 0; i < steps; i++) {
      const ax = -spring * (this.scaleX - 1.0) - damping * this.squashVelocityX;
      this.squashVelocityX = Math.max(-8, Math.min(8, this.squashVelocityX + ax * subDt));
      this.scaleX = Math.max(0.72, Math.min(1.28, this.scaleX + this.squashVelocityX * subDt));

      const ay = -spring * (this.scaleY - 1.0) - damping * this.squashVelocityY;
      this.squashVelocityY = Math.max(-8, Math.min(8, this.squashVelocityY + ay * subDt));
      this.scaleY = Math.max(0.72, Math.min(1.28, this.scaleY + this.squashVelocityY * subDt));

      // Roly-Poly upright spring: angle seeks 0 with gentle damping (±25° max tilt)
      const torque = -rolySpring * this.angle - rolyDamping * this.angularVelocity;
      this.angularVelocity = Math.max(-10, Math.min(10, this.angularVelocity + torque * subDt));
      this.angle += this.angularVelocity * subDt;

      if (this.angle > 0.45) {
        this.angle = 0.45;
        if (this.angularVelocity > 0) this.angularVelocity = 0;
      } else if (this.angle < -0.45) {
        this.angle = -0.45;
        if (this.angularVelocity < 0) this.angularVelocity = 0;
      }
    }

    // Snap to rest when settled to avoid micro-oscillations
    if (Math.abs(this.scaleX - 1.0) < 0.0015 && Math.abs(this.squashVelocityX) < 0.01) {
      this.scaleX = 1.0;
      this.squashVelocityX = 0;
    }
    if (Math.abs(this.scaleY - 1.0) < 0.0015 && Math.abs(this.squashVelocityY) < 0.01) {
      this.scaleY = 1.0;
      this.squashVelocityY = 0;
    }
    if (Math.abs(this.angle) < 0.001 && Math.abs(this.angularVelocity) < 0.01) {
      this.angle = 0;
      this.angularVelocity = 0;
    }
  }
}
