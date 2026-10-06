import { IEnemy, IEnemyDef, Vec2 } from '../../types/interfaces';
import { EventBus } from '../../core/eventBus';

export type BossPattern = 'charge' | 'radial_burst' | 'summon';

export class Enemy implements IEnemy {
  public id: string;
  public def: IEnemyDef;
  public hp: number;
  public maxHp: number;
  public pos: Vec2;
  public vel: Vec2 = { x: 0, y: 0 };
  public speed: number;
  public damage: number;
  public xpValue: number;
  public isElite: boolean = false;
  public isBoss: boolean = false;
  public scale: number;
  public color: string;

  // Behavior state
  private stateTimer: number = 0;
  private isDashing: boolean = false;
  private dashTelegraph: boolean = false;
  private dashTarget: Vec2 = { x: 0, y: 0 };

  // Hit flash timer (80ms per Module D)
  public hitFlashTimer: number = 0;

  // Boss state
  public bossPattern: BossPattern = 'charge';
  private patternTimer: number = 0;
  public bossActionTriggered: boolean = false;

  // Flags for director/combat loop to inspect
  public pendingSplit: boolean = false;
  public pendingExplosion: { radius: number; damage: number } | null = null;
  public pendingSummon: number = 0;
  public pendingRadialBurst: boolean = false;

  constructor(def: IEnemyDef, pos: Vec2, isElite: boolean = false, isBoss: boolean = false) {
    this.id = `${def.id}_${Math.random().toString(36).substring(2, 9)}`;
    this.def = def;
    this.pos = { ...pos };
    this.isElite = isElite;
    this.isBoss = isBoss;

    const hpMultiplier = isBoss ? 20 : (isElite ? 10 : 1);
    this.maxHp = Math.round(def.hp * hpMultiplier);
    this.hp = this.maxHp;

    this.speed = isElite ? def.speed * 1.15 : def.speed;
    this.damage = Math.round(def.damage * (isBoss ? 2 : (isElite ? 1.5 : 1)));
    this.xpValue = Math.round(def.xpValue * (isBoss ? 10 : (isElite ? 5 : 1)));
    this.scale = isBoss ? 2.5 : (isElite ? 1.5 : def.scale);
    this.color = isElite ? '#eab308' : def.color; // Gold tint for elites per specs
  }

  public takeDamage(n: number): boolean {
    this.hp -= n;
    this.hitFlashTimer = 0.08; // 80ms hit-flash
    EventBus.get().emit('enemy_damaged', {
      enemy: this,
      amount: n,
      pos: { ...this.pos }
    });

    if (this.hp <= 0) {
      this.hp = 0;
      if (this.def.behavior === 'split') {
        this.pendingSplit = true;
      }
      if (this.def.behavior === 'kamikaze') {
        this.pendingExplosion = { radius: 90, damage: this.damage * 1.5 };
      }
      EventBus.get().emit('enemy_killed', {
        enemy: this,
        isElite: this.isElite,
        isBoss: this.isBoss,
        pos: { ...this.pos }
      });
      return true; // Dead
    }
    return false;
  }

  public update(dt: number, playerPos: Vec2): void {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    const dx = playerPos.x - this.pos.x;
    const dy = playerPos.y - this.pos.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (this.isBoss) {
      this.updateBoss(dt, playerPos, nx, ny, dist);
      return;
    }

    switch (this.def.behavior) {
      case 'chase':
      case 'tank': {
        this.vel.x = nx * this.speed;
        this.vel.y = ny * this.speed;
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        break;
      }

      case 'dash': {
        this.stateTimer += dt;
        if (this.isDashing) {
          // In high speed dash
          this.pos.x += this.vel.x * dt;
          this.pos.y += this.vel.y * dt;
          if (this.stateTimer > 0.45) {
            this.isDashing = false;
            this.dashTelegraph = false;
            this.stateTimer = 0;
          }
        } else if (this.dashTelegraph) {
          // Telegraphed windup (slow movement, orange aura/line)
          this.vel.x = nx * (this.speed * 0.15);
          this.vel.y = ny * (this.speed * 0.15);
          this.pos.x += this.vel.x * dt;
          this.pos.y += this.vel.y * dt;
          if (this.stateTimer > 0.8) {
            this.isDashing = true;
            this.dashTelegraph = false;
            this.stateTimer = 0;
            // Lock dash vector towards player's last recorded position
            this.vel.x = nx * (this.speed * 3.2);
            this.vel.y = ny * (this.speed * 3.2);
          }
        } else {
          // Normal chase movement
          this.vel.x = nx * this.speed;
          this.vel.y = ny * this.speed;
          this.pos.x += this.vel.x * dt;
          this.pos.y += this.vel.y * dt;
          if (dist < 260 && this.stateTimer > 2.5) {
            this.dashTelegraph = true;
            this.stateTimer = 0;
            this.dashTarget = { ...playerPos };
          }
        }
        break;
      }

      case 'split': {
        // Approaching player with medium cadence
        this.vel.x = nx * this.speed;
        this.vel.y = ny * this.speed;
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        break;
      }

      case 'ranged': {
        // Keep kite distance ~220px
        if (dist < 180) {
          // Retreat
          this.vel.x = -nx * this.speed;
          this.vel.y = -ny * this.speed;
        } else if (dist > 280) {
          // Advance
          this.vel.x = nx * this.speed;
          this.vel.y = ny * this.speed;
        } else {
          // Circle or stop
          this.vel.x = -ny * (this.speed * 0.6);
          this.vel.y = nx * (this.speed * 0.6);
        }
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        break;
      }

      case 'kamikaze': {
        // Fast direct approach; detonate when in lethal range (<35px)
        this.vel.x = nx * this.speed;
        this.vel.y = ny * this.speed;
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        if (dist <= 35) {
          this.hp = 0;
          this.pendingExplosion = { radius: 100, damage: this.damage * 1.5 };
          EventBus.get().emit('enemy_killed', {
            enemy: this,
            isElite: this.isElite,
            isBoss: false,
            pos: { ...this.pos }
          });
        }
        break;
      }
    }
  }

  private updateBoss(dt: number, playerPos: Vec2, nx: number, ny: number, dist: number): void {
    this.patternTimer += dt;

    // Pattern rotation cycle: 4s charge -> 4s radial burst -> 4s summon
    if (this.patternTimer > 12) {
      this.patternTimer = 0;
    }

    if (this.patternTimer < 4) {
      this.bossPattern = 'charge';
    } else if (this.patternTimer < 8) {
      this.bossPattern = 'radial_burst';
    } else {
      this.bossPattern = 'summon';
    }

    switch (this.bossPattern) {
      case 'charge': {
        // Rapid charge towards player
        this.vel.x = nx * (this.speed * 1.7);
        this.vel.y = ny * (this.speed * 1.7);
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        break;
      }
      case 'radial_burst': {
        // Stomp and prepare radial wave
        this.vel.x = nx * (this.speed * 0.2);
        this.vel.y = ny * (this.speed * 0.2);
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        if (Math.floor(this.patternTimer * 2) % 2 === 0 && !this.bossActionTriggered) {
          this.pendingRadialBurst = true;
          this.bossActionTriggered = true;
        } else if (Math.floor(this.patternTimer * 2) % 2 !== 0) {
          this.bossActionTriggered = false;
        }
        break;
      }
      case 'summon': {
        // Slow ritual, summoning minions
        this.vel.x = nx * (this.speed * 0.3);
        this.vel.y = ny * (this.speed * 0.3);
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        if (this.patternTimer > 9.5 && !this.bossActionTriggered) {
          this.pendingSummon = 4;
          this.bossActionTriggered = true;
        }
        break;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const radius = 12 * this.scale;

    // Telegraph indicator for dashers
    if (this.dashTelegraph) {
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
    }

    // Elite gold glow
    if (this.isElite) {
      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.fill();
    }

    // Boss ominous ring
    if (this.isBoss) {
      ctx.beginPath();
      ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Main body
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);

    if (this.hitFlashTimer > 0) {
      // 80ms white hit-flash
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
    }
    ctx.fill();

    // Health bar for tank/elites/bosses
    if (this.isBoss || this.isElite || this.maxHp > 100) {
      const barWidth = radius * 2;
      const barHeight = 4;
      const hpPercent = Math.max(0, this.hp / this.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-radius, -radius - 10, barWidth, barHeight);

      ctx.fillStyle = this.isBoss ? '#ef4444' : (this.isElite ? '#eab308' : '#22c55e');
      ctx.fillRect(-radius, -radius - 10, barWidth * hpPercent, barHeight);
    }

    ctx.restore();
  }
}
