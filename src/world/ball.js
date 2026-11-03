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

  triggerSquash(normalX, normalY, intensity) {
    const factor = Math.min(0.45, Math.abs(intensity) * 0.04);
    // Squash in direction of normal, stretch orthogonally
    this.scaleX = 1.0 + Math.abs(normalY) * factor - Math.abs(normalX) * factor;
    this.scaleY = 1.0 + Math.abs(normalX) * factor - Math.abs(normalY) * factor;
  }

  updateAnimation(dt, zone, isGolden) {
    this.breathePhase += dt * 2.0;
    this.dreamPhase += dt * 1.6;

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
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 0.15 : Math.random() * 4 + 2.5;
    }

    // Squash recovery spring
    const spring = 180;
    const damping = 12;

    const ax = -spring * (this.scaleX - 1.0) - damping * this.squashVelocityX;
    this.squashVelocityX += ax * dt;
    this.scaleX += this.squashVelocityX * dt;

    const ay = -spring * (this.scaleY - 1.0) - damping * this.squashVelocityY;
    this.squashVelocityY += ay * dt;
    this.scaleY += this.squashVelocityY * dt;

    // Roly-Poly upright spring: angle seeks 0 with gentle damping (±25° max tilt)
    const rolySpring = 42;
    const rolyDamping = 8;
    const torque = -rolySpring * this.angle - rolyDamping * this.angularVelocity;
    this.angularVelocity += torque * dt;
    this.angle += this.angularVelocity * dt;
    // Clamp angle to ±25 degrees (~0.44 rad) so characters never turn upside down
    this.angle = Math.max(-0.45, Math.min(0.45, this.angle));
  }
}
