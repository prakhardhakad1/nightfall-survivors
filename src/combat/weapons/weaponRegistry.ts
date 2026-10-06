import { BaseWeapon } from './baseWeapon';
import { IWeaponDef, CombatCtx, Vec2, IEnemy, Projectile } from '../../types/interfaces';

// 1. Spark Dagger & Storm Dagger
export class SparkDaggerWeapon extends BaseWeapon {
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      const count = lvl.count;
      const nearest = ctx.spatialQuery(ctx.playerPos, 500);
      if (nearest.length === 0) return;

      this.cooldown = lvl.cooldown;
      ctx.triggerSound('dagger_throw');

      for (let i = 0; i < count; i++) {
        const target = nearest[Math.min(i, nearest.length - 1)];
        const dx = target.pos.x - ctx.playerPos.x;
        const dy = target.pos.y - ctx.playerPos.y;
        const fanSpread = count > 1 ? (i - (count - 1) / 2) * 0.15 : 0;
        const angle = Math.atan2(dy, dx) + fanSpread;
        const speed = lvl.speed;
        const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

        const proj: Projectile = {
          id: `spark_dagger_${Date.now()}_${i}`,
          pos: { x: ctx.playerPos.x, y: ctx.playerPos.y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          radius: this.isEvolved ? 8 : 5,
          damage,
          duration: 1.5,
          color: this.isEvolved ? '#38bdf8' : '#facc15',
          pierce: this.isEvolved ? 3 : (this.level >= 8 ? 1 : 0),
          isCrit,
          onHit: (hitEnemy, hitCtx) => {
            if (this.isEvolved) {
              // Evolved chain effect on hit
              const nearby = hitCtx.spatialQuery(hitEnemy.pos, 150);
              for (const n of nearby.slice(0, 3)) {
                if (n !== hitEnemy) {
                  const killed = n.takeDamage(Math.round(damage * 0.6));
                  hitCtx.spawnDamageNumber(n.pos, Math.round(damage * 0.6), false);
                }
              }
            }
          }
        };
        ctx.spawnProjectile(proj);
      }
    }
  }
}

// 2. Ember Orbit & Solar Corona
export class EmberOrbitWeapon extends BaseWeapon {
  private angle: number = 0;
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    const lvl = this.currentLevelDef;
    const speed = (lvl.speed / 180) * Math.PI * 2;
    this.angle += speed * dt;

    const count = lvl.count;
    const radius = 70 * lvl.area;
    const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

    for (let i = 0; i < count; i++) {
      const orbAngle = this.angle + (i * Math.PI * 2) / count;
      const orbPos: Vec2 = {
        x: ctx.playerPos.x + Math.cos(orbAngle) * radius,
        y: ctx.playerPos.y + Math.sin(orbAngle) * radius
      };

      const hits = ctx.spatialQuery(orbPos, this.isEvolved ? 18 : 12);
      for (const enemy of hits) {
        if (enemy.takeDamage(Math.round(damage * dt * 3))) {
          // killed
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, playerPos: Vec2): void {
    const lvl = this.currentLevelDef;
    const count = lvl.count;
    const radius = 70 * lvl.area;

    for (let i = 0; i < count; i++) {
      const orbAngle = this.angle + (i * Math.PI * 2) / count;
      const x = playerPos.x + Math.cos(orbAngle) * radius;
      const y = playerPos.y + Math.sin(orbAngle) * radius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, this.isEvolved ? 12 : 7, 0, Math.PI * 2);
      ctx.fillStyle = this.isEvolved ? '#f97316' : '#ef4444';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = this.isEvolved ? 15 : 8;
      ctx.fill();
      ctx.restore();
    }
  }
}

// 3. Frost Nova & Absolute Zero
export class FrostNovaWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private expandingRing: { radius: number; maxRadius: number; active: boolean } = { radius: 0, maxRadius: 0, active: false };

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.expandingRing.active) {
      this.expandingRing.radius += dt * 400;
      if (this.expandingRing.radius >= this.expandingRing.maxRadius) {
        this.expandingRing.active = false;
      }
    }

    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      this.expandingRing = { radius: 10, maxRadius: lvl.area, active: true };
      ctx.triggerSound('frost_nova');
      ctx.applyScreenshake(this.isEvolved ? 5 : 2);

      const affected = ctx.spatialQuery(ctx.playerPos, lvl.area);
      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      for (const enemy of affected) {
        enemy.takeDamage(damage);
        ctx.spawnDamageNumber(enemy.pos, damage, isCrit);
        enemy.speed *= 0.5; // Chilled
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, playerPos: Vec2): void {
    if (!this.expandingRing.active) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, this.expandingRing.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.isEvolved ? 'rgba(56, 189, 248, 0.8)' : 'rgba(147, 197, 253, 0.5)';
    ctx.lineWidth = this.isEvolved ? 6 : 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }
}

// 4. Chain Lightning & Thunderstorm
export class ChainLightningWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private recentArcs: { from: Vec2; to: Vec2; timer: number }[] = [];

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    this.recentArcs = this.recentArcs.filter(a => {
      a.timer -= dt;
      return a.timer > 0;
    });

    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      const initial = ctx.spatialQuery(ctx.playerPos, 400);
      if (initial.length === 0) return;

      this.cooldown = lvl.cooldown;
      ctx.triggerSound('chain_lightning');
      ctx.applyScreenshake(this.isEvolved ? 6 : 3);

      const chainCount = lvl.count;
      let currentTarget: IEnemy = initial[0];
      let lastPos: Vec2 = { ...ctx.playerPos };
      const visited = new Set<string>();

      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      for (let i = 0; i < chainCount; i++) {
        if (!currentTarget) break;
        visited.add(currentTarget.id);
        currentTarget.takeDamage(damage);
        ctx.spawnDamageNumber(currentTarget.pos, damage, isCrit);

        this.recentArcs.push({
          from: { ...lastPos },
          to: { ...currentTarget.pos },
          timer: 0.12
        });

        lastPos = { ...currentTarget.pos };
        const nearby = ctx.spatialQuery(currentTarget.pos, lvl.area);
        const next = nearby.find(e => !visited.has(e.id));
        if (next) {
          currentTarget = next;
        } else {
          break;
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.recentArcs.length === 0) return;
    ctx.save();
    ctx.strokeStyle = this.isEvolved ? '#facc15' : '#60a5fa';
    ctx.lineWidth = this.isEvolved ? 3 : 2;
    ctx.shadowColor = '#93c5fd';
    ctx.shadowBlur = 8;
    for (const arc of this.recentArcs) {
      ctx.beginPath();
      ctx.moveTo(arc.from.x, arc.from.y);
      // Jagged lightning midpoint
      const midX = (arc.from.x + arc.to.x) / 2 + (Math.random() - 0.5) * 16;
      const midY = (arc.from.y + arc.to.y) / 2 + (Math.random() - 0.5) * 16;
      ctx.lineTo(midX, midY);
      ctx.lineTo(arc.to.x, arc.to.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 5. Boomerang Blade & Scythe of Vengeance
export class BoomerangBladeWeapon extends BaseWeapon {
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const count = lvl.count;
      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      for (let i = 0; i < count; i++) {
        const baseAngle = (i * Math.PI * 2) / count + Math.random() * 0.2;
        const speed = lvl.speed;
        let elapsed = 0;
        const maxOutTime = 0.7;

        const proj: Projectile = {
          id: `boomerang_${Date.now()}_${i}`,
          pos: { x: ctx.playerPos.x, y: ctx.playerPos.y },
          vel: { x: Math.cos(baseAngle) * speed, y: Math.sin(baseAngle) * speed },
          radius: this.isEvolved ? 14 : 9,
          damage,
          duration: 1.6,
          color: this.isEvolved ? '#dc2626' : '#10b981',
          pierce: 999,
          isCrit,
          update: (pDt, pCtx) => {
            elapsed += pDt;
            if (elapsed > maxOutTime) {
              // Curve back toward player
              const dx = pCtx.playerPos.x - proj.pos.x;
              const dy = pCtx.playerPos.y - proj.pos.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 10) {
                proj.vel.x = (dx / dist) * speed * 1.2;
                proj.vel.y = (dy / dist) * speed * 1.2;
              }
            }
          }
        };
        ctx.spawnProjectile(proj);
      }
    }
  }
}

// 6. Venom Cloud & Toxic Miasma
export class VenomCloudWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private puddles: { pos: Vec2; radius: number; life: number; maxLife: number; damage: number }[] = [];

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    // Update existing puddles
    this.puddles = this.puddles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      const enemies = ctx.spatialQuery(p.pos, p.radius);
      for (const e of enemies) {
        e.takeDamage(Math.round(p.damage * dt * 2));
      }
      return true;
    });

    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const count = lvl.count;
      const { damage } = this.calculateDamage(lvl.damage, ctx.playerStats);

      for (let i = 0; i < count; i++) {
        const offset: Vec2 = {
          x: ctx.playerPos.x + (Math.random() - 0.5) * 160,
          y: ctx.playerPos.y + (Math.random() - 0.5) * 160
        };
        this.puddles.push({
          pos: offset,
          radius: lvl.area,
          life: 3.5,
          maxLife: 3.5,
          damage
        });
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.puddles) {
      ctx.save();
      const alpha = Math.min(0.4, (p.life / p.maxLife) * 0.4);
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.isEvolved ? `rgba(168, 85, 247, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
      ctx.fill();
      ctx.restore();
    }
  }
}

// 7. Prism Beam & Death Ray
export class PrismBeamWeapon extends BaseWeapon {
  private angle: number = 0;
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    const lvl = this.currentLevelDef;
    const rotSpeed = (lvl.speed / 100) * Math.PI;
    this.angle += rotSpeed * dt;

    const count = lvl.count;
    const beamLength = 260 * lvl.area;
    const { damage } = this.calculateDamage(lvl.damage, ctx.playerStats);

    for (let i = 0; i < count; i++) {
      const bAngle = this.angle + (i * Math.PI * 2) / count;
      // Raycast sample along beam
      const steps = 6;
      for (let s = 1; s <= steps; s++) {
        const checkPos: Vec2 = {
          x: ctx.playerPos.x + Math.cos(bAngle) * (s * (beamLength / steps)),
          y: ctx.playerPos.y + Math.sin(bAngle) * (s * (beamLength / steps))
        };
        const targets = ctx.spatialQuery(checkPos, 22);
        for (const t of targets) {
          t.takeDamage(Math.round(damage * dt * 2.5));
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, playerPos: Vec2): void {
    const lvl = this.currentLevelDef;
    const count = lvl.count;
    const beamLength = 260 * lvl.area;

    ctx.save();
    ctx.lineWidth = this.isEvolved ? 8 : 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const bAngle = this.angle + (i * Math.PI * 2) / count;
      ctx.beginPath();
      ctx.moveTo(playerPos.x, playerPos.y);
      ctx.lineTo(playerPos.x + Math.cos(bAngle) * beamLength, playerPos.y + Math.sin(bAngle) * beamLength);
      ctx.strokeStyle = this.isEvolved ? 'rgba(236, 72, 153, 0.75)' : 'rgba(56, 189, 248, 0.7)';
      ctx.shadowColor = this.isEvolved ? '#f43f5e' : '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 8. Meteor Call & Starfall
export class MeteorCallWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private strikes: { pos: Vec2; radius: number; timer: number; damage: number }[] = [];

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    this.strikes = this.strikes.filter(s => {
      s.timer -= dt;
      if (s.timer <= 0) {
        // Detonate meteor!
        ctx.applyScreenshake(this.isEvolved ? 9 : 5);
        ctx.triggerSound('ember_hit');
        const enemies = ctx.spatialQuery(s.pos, s.radius);
        for (const e of enemies) {
          e.takeDamage(s.damage);
          ctx.spawnDamageNumber(e.pos, s.damage, true);
        }
        return false;
      }
      return true;
    });

    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const count = lvl.count;
      const { damage } = this.calculateDamage(lvl.damage, ctx.playerStats);

      const nearby = ctx.spatialQuery(ctx.playerPos, 450);
      for (let i = 0; i < count; i++) {
        const targetPos: Vec2 = nearby.length > 0
          ? { ...nearby[Math.floor(Math.random() * nearby.length)].pos }
          : {
              x: ctx.playerPos.x + (Math.random() - 0.5) * 300,
              y: ctx.playerPos.y + (Math.random() - 0.5) * 300
            };

        this.strikes.push({
          pos: targetPos,
          radius: lvl.area,
          timer: 0.6,
          damage
        });
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const s of this.strikes) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y, s.radius * (1 - s.timer / 0.6), 0, Math.PI * 2);
      ctx.fillStyle = this.isEvolved ? 'rgba(251, 146, 60, 0.4)' : 'rgba(239, 68, 68, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 9. Thorn Guard & Bramble Bastion
export class ThornGuardWeapon extends BaseWeapon {
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const radius = lvl.area;
      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      const intruders = ctx.spatialQuery(ctx.playerPos, radius);
      for (const e of intruders) {
        e.takeDamage(damage);
        ctx.spawnDamageNumber(e.pos, damage, isCrit);
        // Pushback
        const dx = e.pos.x - ctx.playerPos.x;
        const dy = e.pos.y - ctx.playerPos.y;
        const len = Math.hypot(dx, dy) || 1;
        e.pos.x += (dx / len) * 20;
        e.pos.y += (dy / len) * 20;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, playerPos: Vec2): void {
    const lvl = this.currentLevelDef;
    ctx.save();
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, lvl.area, 0, Math.PI * 2);
    ctx.strokeStyle = this.isEvolved ? '#15803d' : '#84cc16';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();
  }
}

// 10. Gale Blades & Cyclone Blades
export class GaleBladesWeapon extends BaseWeapon {
  private isEvolved: boolean;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const count = lvl.count;
      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      for (let i = 0; i < count; i++) {
        const startAngle = (i * Math.PI * 2) / count;
        let spiralRadius = 20;
        let angle = startAngle;

        const proj: Projectile = {
          id: `gale_${Date.now()}_${i}`,
          pos: { x: ctx.playerPos.x, y: ctx.playerPos.y },
          vel: { x: 0, y: 0 },
          radius: 8,
          damage,
          duration: 2.0,
          color: this.isEvolved ? '#2dd4bf' : '#a7f3d0',
          pierce: 5,
          isCrit,
          update: (pDt, pCtx) => {
            angle += pDt * 5;
            spiralRadius += pDt * lvl.speed;
            proj.pos.x = pCtx.playerPos.x + Math.cos(angle) * spiralRadius;
            proj.pos.y = pCtx.playerPos.y + Math.sin(angle) * spiralRadius;
          }
        };
        ctx.spawnProjectile(proj);
      }
    }
  }
}

// 11. Moon Aura & Eclipse Nova
export class MoonAuraWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private hitCount: number = 0;

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    if (this.cooldown <= 0) {
      const lvl = this.currentLevelDef;
      this.cooldown = lvl.cooldown;
      const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

      const targets = ctx.spatialQuery(ctx.playerPos, lvl.area);
      for (const t of targets) {
        t.takeDamage(damage);
        this.hitCount++;
        if (this.level >= 8 && this.hitCount % 50 === 0) {
          ctx.playerStats.hp = Math.min(ctx.playerStats.maxHp, ctx.playerStats.hp + 1);
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, playerPos: Vec2): void {
    const lvl = this.currentLevelDef;
    ctx.save();
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, lvl.area, 0, Math.PI * 2);
    ctx.fillStyle = this.isEvolved ? 'rgba(76, 29, 149, 0.15)' : 'rgba(167, 139, 250, 0.1)';
    ctx.fill();
    ctx.strokeStyle = this.isEvolved ? '#7c3aed' : '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// 12. Howl Pack & Apex Pack
export class HowlPackWeapon extends BaseWeapon {
  private isEvolved: boolean;
  private wolves: { pos: Vec2; targetPos: Vec2; speed: number }[] = [];

  constructor(def: IWeaponDef, level: number = 1, isEvolved: boolean = false) {
    super(def, level);
    this.isEvolved = isEvolved;
  }

  protected onUpdate(dt: number, ctx: CombatCtx): void {
    const lvl = this.currentLevelDef;
    const desiredWolves = lvl.count;

    while (this.wolves.length < desiredWolves) {
      this.wolves.push({
        pos: { x: ctx.playerPos.x + (Math.random() - 0.5) * 60, y: ctx.playerPos.y + (Math.random() - 0.5) * 60 },
        targetPos: { x: ctx.playerPos.x, y: ctx.playerPos.y },
        speed: lvl.speed
      });
    }

    const { damage, isCrit } = this.calculateDamage(lvl.damage, ctx.playerStats);

    for (const wolf of this.wolves) {
      const enemies = ctx.spatialQuery(wolf.pos, 250);
      if (enemies.length > 0) {
        wolf.targetPos = { ...enemies[0].pos };
      } else {
        wolf.targetPos = { ...ctx.playerPos };
      }

      const dx = wolf.targetPos.x - wolf.pos.x;
      const dy = wolf.targetPos.y - wolf.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        wolf.pos.x += (dx / dist) * wolf.speed * dt;
        wolf.pos.y += (dy / dist) * wolf.speed * dt;
      }

      // Attack if colliding with target
      const hit = ctx.spatialQuery(wolf.pos, 20);
      for (const h of hit) {
        if (h.takeDamage(Math.round(damage * dt * 2.5))) {
          // killed
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const w of this.wolves) {
      ctx.beginPath();
      ctx.arc(w.pos.x, w.pos.y, this.isEvolved ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = this.isEvolved ? '#e11d48' : '#e2e8f0';
      ctx.shadowColor = '#fda4af';
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();
  }
}
