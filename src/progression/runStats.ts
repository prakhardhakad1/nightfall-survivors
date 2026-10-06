export class RunStats {
  public timeSurvived: number = 0;
  public totalKills: number = 0;
  public eliteKills: number = 0;
  public bossKills: number = 0;
  public totalDamageDealt: number = 0;
  public coinsEarned: number = 0;
  public levelReached: number = 1;
  public evolutionsTriggered: string[] = [];

  public recordDamage(amount: number): void {
    this.totalDamageDealt += amount;
  }

  public recordKill(isElite: boolean, isBoss: boolean): void {
    this.totalKills++;
    if (isBoss) this.bossKills++;
    else if (isElite) this.eliteKills++;
  }

  public recordCoin(amount: number = 1): void {
    this.coinsEarned += amount;
  }

  public recordEvolution(evolvedName: string): void {
    this.evolutionsTriggered.push(evolvedName);
  }

  public formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  public getSummary() {
    return {
      timeSurvived: this.formatTime(this.timeSurvived),
      rawTime: this.timeSurvived,
      totalKills: this.totalKills,
      eliteKills: this.eliteKills,
      bossKills: this.bossKills,
      totalDamageDealt: this.totalDamageDealt.toLocaleString(),
      coinsEarned: this.coinsEarned,
      levelReached: this.levelReached,
      evolutions: this.evolutionsTriggered
    };
  }
}
