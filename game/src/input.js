// Keyboard (arrows / WASD), mouse steering, and action keys.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = null;
    this.mouseY = null;
    this.mouseDown = false;
    this.pressed = new Set();
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', () => { this.mouseDown = true; this.pressed.add('click'); });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; if (!t) return;
      const r = canvas.getBoundingClientRect();
      this.mouseX = (t.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (t.clientY - r.top) * (canvas.height / r.height);
      this.pressed.add('click');
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0]; if (!t) return;
      const r = canvas.getBoundingClientRect();
      this.mouseX = (t.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (t.clientY - r.top) * (canvas.height / r.height);
    }, { passive: true });
  }
  down(...names) { return names.some((n) => this.keys.has(n)); }
  axisX() {
    let a = 0;
    if (this.down('arrowleft', 'a')) a -= 1;
    if (this.down('arrowright', 'd')) a += 1;
    return a;
  }
  axisY() {
    let a = 0;
    if (this.down('arrowup', 'w')) a -= 1;
    if (this.down('arrowdown', 's')) a += 1;
    return a;
  }
  wasPressed(...names) { return names.some((n) => this.pressed.has(n)); }
  endFrame() { this.pressed.clear(); }
}
