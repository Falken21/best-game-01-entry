// Emberwake — keyboard and pointer input.
// The game reads intent, not devices: a steering axis from the keys,
// a pointer the ember can lean toward, and a queue of key presses
// that menus and state changes consume once each.

const STEER_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.presses = [];
    this.pointer = { x: 0, y: 0, active: false, down: false };
    this.anyGesture = false;

    window.addEventListener('keydown', (e) => {
      if (STEER_KEYS[e.code] || e.code === 'Space') e.preventDefault();
      if (!e.repeat) {
        this.held.add(e.code);
        this.presses.push(e.code);
        this.anyGesture = true;
      }
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());

    canvas.addEventListener('pointermove', (e) => {
      const p = this.toGameCoords(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.active = true;
    });
    canvas.addEventListener('pointerdown', (e) => {
      const p = this.toGameCoords(e);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.active = true;
      this.pointer.down = true;
      this.anyGesture = true;
      this.presses.push('PointerDown');
    });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
    canvas.addEventListener('pointerleave', () => { this.pointer.active = false; });
  }

  toGameCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  // Steering axis from held keys, normalised so diagonals are fair.
  axis() {
    let x = 0, y = 0;
    for (const code of this.held) {
      const v = STEER_KEYS[code];
      if (v) { x += v[0]; y += v[1]; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  // Take the presses gathered since the last call; each is read once.
  takePresses() {
    const out = this.presses;
    this.presses = [];
    return out;
  }

  pressed(code) {
    return this.presses.includes(code);
  }
}
