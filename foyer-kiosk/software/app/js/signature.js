// Signature pad: smoothed, pressure-like strokes; exports a black-on-transparent PNG.

const MIN_WIDTH = 2.4;
const MAX_WIDTH = 6.5;

export class SignaturePad {
  constructor(canvas, onChange) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.strokes = [];
    this.current = null;
    // Layout size (offsetWidth) ignores the viewport's scale transform.
    this.ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.offsetWidth * this.ratio);
    canvas.height = Math.round(canvas.offsetHeight * this.ratio);
    this.ctx = canvas.getContext("2d");
    this.handlers = {
      pointerdown: (e) => this.start(e),
      pointermove: (e) => this.move(e),
      pointerup: () => this.end(),
      pointercancel: () => this.end(),
      pointerleave: () => this.end(),
    };
    for (const [type, handler] of Object.entries(this.handlers)) canvas.addEventListener(type, handler);
  }

  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
      t: event.timeStamp,
    };
  }

  start(event) {
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.current = [this.point(event)];
    this.strokes.push(this.current);
  }

  move(event) {
    if (!this.current) return;
    this.current.push(this.point(event));
    this.draw(this.ctx, getComputedStyle(this.canvas).color, [this.current], true);
  }

  end() {
    if (!this.current) return;
    this.current = null;
    this.onChange(!this.isEmpty());
  }

  isEmpty() {
    return !this.strokes.some((s) => s.length > 1);
  }

  clear() {
    this.strokes = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onChange(false);
  }

  /** Quadratic-midpoint smoothing with width inversely tied to pen speed. */
  draw(ctx, colour, strokes, incremental = false) {
    ctx.strokeStyle = colour;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      const from = incremental ? Math.max(1, stroke.length - 2) : 1;
      for (let i = from; i < stroke.length; i++) {
        const a = stroke[i - 1];
        const b = stroke[i];
        const prev = stroke[i - 2] ?? a;
        const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
        ctx.lineWidth = Math.max(MIN_WIDTH, MAX_WIDTH - speed * 1.4) * this.ratio;
        ctx.beginPath();
        ctx.moveTo((prev.x + a.x) / 2, (prev.y + a.y) / 2);
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.stroke();
      }
    }
  }

  toDataURL() {
    const out = document.createElement("canvas");
    out.width = this.canvas.width;
    out.height = this.canvas.height;
    this.draw(out.getContext("2d"), "#000", this.strokes);
    return out.toDataURL("image/png");
  }

  destroy() {
    for (const [type, handler] of Object.entries(this.handlers)) this.canvas.removeEventListener(type, handler);
    this.strokes = [];
  }
}
