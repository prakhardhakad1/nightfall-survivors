import { describe, it, expect } from 'vitest';
import { XPSystem } from '../src/progression/xpSystem';
import { UpgradeDraft } from '../src/progression/upgradeDraft';
import { PickupManager } from '../src/progression/pickups';
import { RunStats } from '../src/progression/runStats';
import { FXManager } from '../src/fx/fxManager';
import { Player } from '../src/entities/player';
import { WeaponLoader } from '../src/combat/weapons/weaponLoader';

describe('Module C & D: Progression & Juice Systems', () => {
  const loader = WeaponLoader.get();

  it('calculates XP progression curves and triggers level-ups', () => {
    const xp = new XPSystem();
    expect(xp.level).toBe(1);
    expect(xp.targetXP).toBe(5);

    const leveled = xp.addXP(6);
    expect(leveled).toBe(true);
    expect(xp.level).toBe(2);
    expect(xp.currentXP).toBe(1);
    expect(xp.targetXP).toBe(17);
  });

  it('generates 3-card upgrade draft and prioritizes owned weapons/passives', () => {
    const draft = new UpgradeDraft(loader);
    const player = new Player();
    player.addWeapon(loader.createWeapon('spark_dagger', 1));
    player.addPassive('might');

    const cards = draft.generateDraft(player);
    expect(cards.length).toBe(3);

    // Contains upgrade cards for owned items
    const ownedUpgrade = cards.find(c => c.id === 'spark_dagger' || c.id === 'might');
    expect(ownedUpgrade).toBeDefined();

    // Select and apply upgrade
    const success = draft.applySelection(player, cards[0]);
    expect(success).toBe(true);
  });

  it('manages pickups and spawns 3 tiers of XP gems', () => {
    const pm = new PickupManager();
    pm.spawnGem({ x: 10, y: 10 }, 1); // Tier 1
    pm.spawnGem({ x: 20, y: 20 }, 5); // Tier 2
    pm.spawnGem({ x: 30, y: 30 }, 25); // Tier 3

    expect(pm.items.length).toBe(3);
    expect(pm.items[0].tier).toBe(1);
    expect(pm.items[1].tier).toBe(2);
    expect(pm.items[2].tier).toBe(3);
  });

  it('simulates chest pickup evolution trigger', () => {
    const player = new Player();
    // Max level weapon + matching passive
    const dagger = loader.createWeapon('spark_dagger', 8);
    player.addWeapon(dagger);
    player.addPassive('might');

    // Evolution check
    const canEvolve = loader.canEvolve(player.weapons[0], player.passives);
    expect(canEvolve).toBe('storm_dagger');

    const evolved = loader.evolveWeapon(player.weapons[0], player.passives);
    expect(evolved).not.toBeNull();
    player.weapons[0] = evolved!;
    expect(player.weapons[0].id).toBe('storm_dagger');
  });

  it('tracks comprehensive run stats', () => {
    const stats = new RunStats();
    stats.recordKill(false, false);
    stats.recordKill(true, false);
    stats.recordKill(false, true);
    stats.recordDamage(1500);
    stats.recordCoin(5);
    stats.recordEvolution('Storm Dagger');
    stats.timeSurvived = 125;

    const summary = stats.getSummary();
    expect(summary.timeSurvived).toBe('02:05');
    expect(summary.totalKills).toBe(3);
    expect(summary.eliteKills).toBe(1);
    expect(summary.bossKills).toBe(1);
    expect(summary.coinsEarned).toBe(5);
    expect(summary.evolutions).toContain('Storm Dagger');
  });

  it('verifies FX object pools and 40ms hitstop', () => {
    const fx = new FXManager();
    fx.spawnDamageNumber({ x: 0, y: 0 }, 50, true);
    fx.spawnDeathBurst({ x: 0, y: 0 }, '#ef4444', 10);

    // Hitstop
    fx.triggerHitstop(0.04);
    expect(fx.hitstopTimer).toBeCloseTo(0.04);
    // update returns true during hitstop (freeze frame)
    const isFrozen = fx.update(0.01);
    expect(isFrozen).toBe(true);
  });
});
