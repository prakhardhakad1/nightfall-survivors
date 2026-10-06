import { Vec2 } from '../types/interfaces';
import { ObjectPool } from '../core/pool';

export interface DamageNumber {
  active: boolean;
  pos: Vec2;
  amount: number;
  isCrit: boolean;
  life: number;
  maxLife: number;
}

export interface DeathParticle {
  active: boolean;
  pos: Vec2;
  vel: Vec2;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

export class FXManager {
  private static instance: FXManager;

  // Pools for sacred 60fps budget
  private damageNumberPool: ObjectPool<DamageNumber>;
  private activeDamageNumbers: DamageNumber[] = [];

  private particlePool: ObjectPool<DeathParticle>;
  private activeParticles: DeathParticle[] = [];

  // Screenshake trauma system
  private trauma: number = 0;
  public shakeOffset: Vec2 = { x: 0, y: 0 };

  // Hitstop (40ms impact pause on elite/boss kills)
  public hitstopTimer: number = 0;

  // Level-up slow-motion time dilation
  public timeScale: number = 1.0;
  private slowMoTimer: number = 0;

  // Boss banner state
  public bossBannerText: string = '';
  public bossBannerTimer: number = 0;

  public static get(): FXManager {
    if (!FXManager.instance) {
      FXManager.instance = new FXManager();
    }
    return FXManager.instance;
  }

  constructor() {
    this.damageNumberPool = new ObjectPool<DamageNumber>(
      () => ({
        active: false,
        pos: { x: 0, y: 0 },
        amount: 0,
        isCrit: false,
        life: 0,
        maxLife: 0.6
      }),
      (dn) => {
        dn.active = false;
      },
      128
    );

    this.particlePool = new ObjectPool<DeathParticle>(
      () => ({
        active: false,
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        color: '#ffffff',
        radius: 3,
        life: 0,
        maxLife: 0.5
      }),
      (p) => {
        p.active = false;
      },
      256
    );
  }

  public addScreenshake(intensity: number): void {
    this.trauma = Math.min(1.0, this.trauma + intensity);
  }

  public triggerHitstop(durationSec: number = 0.04): void {
    // 40ms freeze frame
    this.hitstopTimer = Math.max(this.hitstopTimer, durationSec);
  }

  public triggerSlowMo(durationSec: number = 0.8, scale: number = 0.3): void {
    this.slowMoTimer = durationSec;
    this.timeScale = scale;
  }

  public showBossBanner(name: string): void {
    this.bossBannerText = name;
    this.bossBannerTimer = 3.0; // 3 seconds
  }

  public spawnDamageNumber(pos: Vec2, amount: number, isCrit: boolean): void {
    const dn = this.damageNumberPool.obtain();
    dn.active = true;
    dn.pos.x = pos.x + (Math.random() - 0.5) * 16;
    dn.pos.y = pos.y - 10 + (Math.random() - 0.5) * 8;
    dn.amount = amount;
    dn.isCrit = isCrit;
    dn.life = 0;
    dn.maxLife = isCrit ? 0.75 : 0.55;
    this.activeDamageNumbers.push(dn);
  }

  public spawnDeathBurst(pos: Vec2, color: string, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.obtain();
      p.active = true;
      p.pos.x = pos.x;
      p.pos.y = pos.y;
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.4;
      const speed = 70 + Math.random() * 140;
      p.vel.x = Math.cos(angle) * speed;
      p.vel.y = Math.sin(angle) * speed;
      p.color = color;
      p.radius = 2.5 + Math.random() * 2.5;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      this.activeParticles.push(p);
    }
  }

  public update(dt: number): boolean {
    // Check hitstop: returns true if frame is frozen
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return true;
    }

    // Slow-mo decay
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1.0;
      }
    }

    // Boss banner decay
    if (this.bossBannerTimer > 0) {
      this.bossBannerTimer -= dt;
    }

    const effectiveDt = dt * this.timeScale;

    // Screenshake decay: quadratic trauma
    if (this.trauma > 0) {
      const shakePower = this.trauma * this.trauma * 16;
      this.shakeOffset.x = (Math.random() * 2 - 1) * shakePower;
      this.shakeOffset.y = (Math.random() * 2 - 1) * shakePower;
      this.trauma = Math.max(0, this.trauma - effectiveDt * 1.8);
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Update damage numbers
    for (let i = this.activeDamageNumbers.length - 1; i >= 0; i--) {
      const dn = this.activeDamageNumbers[i];
      dn.life += effectiveDt;
      dn.pos.y -= effectiveDt * (dn.isCrit ? 45 : 30);
      if (dn.life >= dn.maxLife) {
        this.activeDamageNumbers.splice(i, 1);
        this.damageNumberPool.release(dn);
      }
    }

    // Update death particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += effectiveDt;
      p.pos.x += p.vel.x * effectiveDt;
      p.pos.y += p.vel.y * effectiveDt;
      p.vel.x *= 0.94; // Decelerate
      p.vel.y *= 0.94;
      if (p.life >= p.maxLife) {
        this.activeParticles.splice(i, 1);
        this.particlePool.release(p);
      }
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, playerHpPercent: number, bossHpPercent?: number): void {
    // 1. Death Particles
    for (const p of this.activeParticles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }

    // 2. Damage Numbers
    for (const dn of this.activeDamageNumbers) {
      const alpha = Math.max(0, 1 - dn.life / dn.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = dn.isCrit ? 'bold 18px "Inter", sans-serif' : '13px "Inter", sans-serif';
      ctx.fillStyle = dn.isCrit ? '#facc15' : '#ffffff';
      ctx.shadowColor = dn.isCrit ? '#b45309' : '#000000';
      ctx.shadowBlur = dn.isCrit ? 8 : 4;
      ctx.textAlign = 'center';
      ctx.fillText(dn.amount.toString(), dn.pos.x, dn.pos.y);
      ctx.restore();
    }

    // 3. Low-HP Vignette (Red pulse when HP < 30%)
    if (playerHpPercent < 0.3) {
      const pulse = 0.25 + 0.15 * Math.sin(Date.now() / 150);
      const intensity = (1 - playerHpPercent / 0.3) * pulse;
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(1, `rgba(239, 68, 68, ${intensity})`);

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 4. Boss Introduction Banner
    if (this.bossBannerTimer > 0) {
      ctx.save();
      const bannerAlpha = Math.min(1.0, this.bossBannerTimer);
      ctx.fillStyle = `rgba(15, 23, 42, ${0.85 * bannerAlpha})`;
      ctx.fillRect(0, height * 0.22, width, 60);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 15;
      ctx.fillText(`WARNING: ${this.bossBannerText}`, width / 2, height * 0.22 + 30);
      ctx.restore();
    }

    // 5. Boss HP Bar (Screen Top)
    if (bossHpPercent !== undefined && bossHpPercent > 0) {
      ctx.save();
      const barW = Math.min(width * 0.75, 420);
      const barH = 14;
      const barX = (width - barW) / 2;
      const barY = 48;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

      ctx.fillStyle = '#dc2626';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(barX, barY, barW * bossHpPercent, barH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NIGHTSTALKER BOSS', width / 2, barY - 6);
      ctx.restore();
    }
  }
}
