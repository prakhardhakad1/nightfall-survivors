import { IWeapon, IWeaponDef, IWeaponLevel, CombatCtx, Vec2, IEnemy } from '../../types/interfaces';

export abstract class BaseWeapon implements IWeapon {
  public id: string;
  public def: IWeaponDef;
  public level: number;
  public cooldown: number = 0;

  constructor(def: IWeaponDef, level: number = 1) {
    this.def = def;
    this.id = def.id;
    this.level = Math.max(1, Math.min(8, level));
  }

  public get currentLevelDef(): IWeaponLevel {
    return this.def.levels[this.level - 1];
  }

  public upgrade(): boolean {
    if (this.level >= 8) return false;
    this.level++;
    return true;
  }

  public update(dt: number, ctx: CombatCtx): void {
    if (this.cooldown > 0) {
      this.cooldown -= dt * ctx.playerStats.attackSpeedMul;
    }
    this.onUpdate(dt, ctx);
  }

  protected abstract onUpdate(dt: number, ctx: CombatCtx): void;

  protected calculateDamage(baseDamage: number, stats: { damageMul: number; critChance: number }): { damage: number; isCrit: boolean } {
    const isCrit = Math.random() < stats.critChance;
    const mul = stats.damageMul * (isCrit ? 2.0 : 1.0);
    const damage = Math.round(baseDamage * mul);
    return { damage, isCrit };
  }

  public render?(ctx: CanvasRenderingContext2D, playerPos: Vec2): void;
}
