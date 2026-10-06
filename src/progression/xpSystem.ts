import { EventBus } from '../core/eventBus';

export class XPSystem {
  public level: number = 1;
  public currentXP: number = 0;
  public totalXPEarned: number = 0;

  // XP curve: progressive scaling per level
  public getRequiredXP(level: number): number {
    if (level <= 1) return 5;
    if (level <= 10) return 5 + (level - 1) * 12;
    if (level <= 25) return 120 + (level - 10) * 20;
    if (level <= 50) return 420 + (level - 25) * 35;
    return 1300 + (level - 50) * 60;
  }

  public get targetXP(): number {
    return this.getRequiredXP(this.level);
  }

  public addXP(amount: number, xpMul: number = 1.0): boolean {
    const actualAmount = Math.max(1, Math.round(amount * xpMul));
    this.currentXP += actualAmount;
    this.totalXPEarned += actualAmount;

    EventBus.get().emit('xp_gained', {
      currentXp: this.currentXP,
      targetXp: this.targetXP,
      level: this.level
    });

    let leveledUp = false;
    while (this.currentXP >= this.targetXP) {
      this.currentXP -= this.targetXP;
      this.level++;
      leveledUp = true;
      EventBus.get().emit('level_up', { level: this.level });
    }

    return leveledUp;
  }
}
