import { Vec2 } from '../types/interfaces';

export class InputManager {
  private static instance: InputManager;
  private moveVec: Vec2 = { x: 0, y: 0 };
  private keysDown: Set<string> = new Set();

  // Virtual joystick state
  private touchActive: boolean = false;
  private touchStart: Vec2 = { x: 0, y: 0 };
  private touchCurrent: Vec2 = { x: 0, y: 0 };
  private readonly maxRadius: number = 60;

  public static get(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  constructor() {
    this.initListeners();
  }

  private initListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.touchActive = true;
        this.touchStart = { x: touch.clientX, y: touch.clientY };
        this.touchCurrent = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.touchActive && e.touches.length > 0) {
        const touch = e.touches[0];
        this.touchCurrent = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: false });

    const endTouch = () => {
      this.touchActive = false;
      this.touchStart = { x: 0, y: 0 };
      this.touchCurrent = { x: 0, y: 0 };
    };

    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);
  }

  public getMovement(): Vec2 {
    let x = 0;
    let y = 0;

    // Keyboard input
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;

    // Touch joystick override if active
    if (this.touchActive) {
      const dx = this.touchCurrent.x - this.touchStart.x;
      const dy = this.touchCurrent.y - this.touchStart.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        const factor = Math.min(dist, this.maxRadius) / this.maxRadius;
        x = (dx / dist) * factor;
        y = (dy / dist) * factor;
        return { x, y };
      }
    }

    // Normalize keyboard vector
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }

    this.moveVec.x = x;
    this.moveVec.y = y;
    return this.moveVec;
  }

  public renderJoystick(ctx: CanvasRenderingContext2D): void {
    if (!this.touchActive) return;

    ctx.save();
    // Base circle
    ctx.beginPath();
    ctx.arc(this.touchStart.x, this.touchStart.y, this.maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Thumb stick
    const dx = this.touchCurrent.x - this.touchStart.x;
    const dy = this.touchCurrent.y - this.touchStart.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = this.touchStart.x + Math.cos(angle) * clampedDist;
    const knobY = this.touchStart.y + Math.sin(angle) * clampedDist;

    ctx.beginPath();
    ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
