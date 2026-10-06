import { Vec2, IStats, IWeapon, IPassiveDef } from '../types/interfaces';
import { EventBus } from '../core/eventBus';

export class Player {
  public pos: Vec2 = { x: 400, y: 300 };
  public vel: Vec2 = { x: 0, y: 0 };
  public radius: number = 16;
  public baseStats: IStats;
  public currentStats: IStats;
  public weapons: IWeapon[] = [];
  public passives: Map<string, number> = new Map(); // passiveId -> level (1-8)
  public invulnerabilityTimer: number = 0;
  public facing: Vec2 = { x: 1, y: 0 };

  constructor(startX: number = 400, startY: number = 300) {
    this.pos = { x: startX, y: startY };
    this.baseStats = {
      hp: 100,
      maxHp: 100,
      moveSpeed: 180,
      damageMul: 1.0,
      attackSpeedMul: 1.0,
      critChance: 0.05,
      magnetRadius: 90,
      armor: 0,
      xpMul: 1.0,
      luck: 1.0,
      coinMul: 1.0
    };
    this.currentStats = { ...this.baseStats };
  }

  public recalculateStats(passiveDefs: IPassiveDef[]): void {
    const s = { ...this.baseStats };
    this.passives.forEach((lvl, passiveId) => {
      const def = passiveDefs.find(p => p.id === passiveId);
      if (def && lvl > 0) {
        const val = def.levels[Math.min(lvl - 1, 7)];
        if (def.stat === 'armor') {
          s.armor = this.baseStats.armor + val;
        } else if (def.stat === 'critChance') {
          s.critChance = this.baseStats.critChance + val;
        } else if (def.stat === 'maxHp') {
          s.maxHp = Math.round(this.baseStats.maxHp * val);
        } else {
          (s as any)[def.stat] = (this.baseStats as any)[def.stat] * val;
        }
      }
    });
    // Maintain health percentage on maxHp update
    const hpRatio = this.currentStats.hp / this.currentStats.maxHp;
    s.hp = Math.min(s.maxHp, Math.max(1, Math.round(hpRatio * s.maxHp)));
    this.currentStats = s;
  }

  public update(dt: number, moveInput: Vec2): void {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    if (moveInput.x !== 0 || moveInput.y !== 0) {
      this.facing.x = moveInput.x;
      this.facing.y = moveInput.y;
    }

    const speed = this.currentStats.moveSpeed;
    this.pos.x += moveInput.x * speed * dt;
    this.pos.y += moveInput.y * speed * dt;
  }

  public takeDamage(amount: number): boolean {
    if (this.invulnerabilityTimer > 0) return false;

    const actualDamage = Math.max(1, Math.round(amount - this.currentStats.armor));
    this.currentStats.hp = Math.max(0, this.currentStats.hp - actualDamage);
    this.invulnerabilityTimer = 0.4; // 400ms grace period

    EventBus.get().emit('player_damaged', {
      currentHp: this.currentStats.hp,
      maxHp: this.currentStats.maxHp,
      amount: actualDamage
    });

    return this.currentStats.hp <= 0;
  }

  public heal(amount: number): void {
    this.currentStats.hp = Math.min(this.currentStats.maxHp, this.currentStats.hp + amount);
    EventBus.get().emit('player_healed', {
      currentHp: this.currentStats.hp,
      amount
    });
  }

  public addWeapon(weapon: IWeapon): boolean {
    if (this.weapons.length >= 6) return false;
    this.weapons.push(weapon);
    return true;
  }

  public addPassive(passiveId: string): boolean {
    if (!this.passives.has(passiveId) && this.passives.size >= 6) return false;
    const current = this.passives.get(passiveId) || 0;
    if (current >= 8) return false;
    this.passives.set(passiveId, current + 1);
    return true;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // If invulnerable, flicker
    if (this.invulnerabilityTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Magnet aura subtle glow
    ctx.beginPath();
    ctx.arc(0, 0, this.currentStats.magnetRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Body: Cyan vector shield/gem shape
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 12;
    ctx.fill();

    // Inner core
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();

    // Facing indicator needle
    ctx.beginPath();
    ctx.moveTo(this.facing.x * (this.radius - 2), this.facing.y * (this.radius - 2));
    ctx.lineTo(this.facing.x * (this.radius + 7), this.facing.y * (this.radius + 7));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
