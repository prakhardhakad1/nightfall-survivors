import { describe, it, expect } from 'vitest';
import { Director } from '../src/combat/director';
import { Enemy } from '../src/combat/enemies/enemy';
import enemiesData from '../data/enemies.json';
import { IEnemyDef } from '../src/types/interfaces';

describe('Module B: Enemy Roster & Director Logic', () => {
  const director = new Director();

  it('contains all 12 enemy types in data/enemies.json', () => {
    expect(enemiesData.length).toBe(12);
    const behaviors = new Set(enemiesData.map(e => e.behavior));
    expect(behaviors.has('chase')).toBe(true);
    expect(behaviors.has('dash')).toBe(true);
    expect(behaviors.has('tank')).toBe(true);
    expect(behaviors.has('split')).toBe(true);
    expect(behaviors.has('ranged')).toBe(true);
    expect(behaviors.has('kamikaze')).toBe(true);
  });

  it('calculates exponential spawn budget that grows monotonically over time', () => {
    const b0 = director.calculateBudget(0);
    const b3min = director.calculateBudget(180);
    const b5min = director.calculateBudget(300);
    const b10min = director.calculateBudget(600);
    const b15min = director.calculateBudget(900);

    expect(b0).toBeGreaterThanOrEqual(3);
    expect(b3min).toBeGreaterThan(b0);
    expect(b5min).toBeGreaterThan(b3min);
    expect(b10min).toBeGreaterThan(b5min);
    expect(b15min).toBeGreaterThan(b10min);
  });

  it('gates enemy pool composition progressively by minute', () => {
    const pool0 = director.getAvailableEnemyIds(30); // Minute 0
    const pool2 = director.getAvailableEnemyIds(150); // Minute 2
    const pool6 = director.getAvailableEnemyIds(360); // Minute 6

    expect(pool0).toContain('chaser');
    expect(pool0).not.toContain('tank');

    expect(pool2).toContain('tank');
    expect(pool2).toContain('splitter');

    expect(pool6).toContain('kamikaze');
    expect(pool6).toContain('shieldbearer');
  });

  it('triggers swarm rings at 3:00 (180s)', () => {
    const d = new Director();
    const orders = d.update(1.0, 180);
    const swarmOrders = orders.filter(o => o.enemyDefId === 'chaser');
    expect(swarmOrders.length).toBeGreaterThanOrEqual(32);
  });

  it('triggers elite packs at 4:00 (240s) with isElite flag', () => {
    const d = new Director();
    const orders = d.update(1.0, 240);
    const eliteOrders = orders.filter(o => o.isElite === true);
    expect(eliteOrders.length).toBe(4);
  });

  it('triggers boss spawn at 5:00 (300s) with isBoss flag', () => {
    const d = new Director();
    const orders = d.update(1.0, 300);
    const bossOrders = orders.filter(o => o.isBoss === true);
    expect(bossOrders.length).toBe(1);
    expect(bossOrders[0].enemyDefId).toBe('boss_nightstalker');
  });

  it('verifies Elite enemies gain 10x HP and gold tint', () => {
    const def = enemiesData.find(e => e.id === 'tank') as IEnemyDef;
    const normal = new Enemy(def, { x: 0, y: 0 }, false);
    const elite = new Enemy(def, { x: 0, y: 0 }, true);

    expect(elite.maxHp).toBe(normal.maxHp * 10);
    expect(elite.color).toBe('#eab308'); // gold tint
  });

  it('verifies Splitter flags pendingSplit on death', () => {
    const def = enemiesData.find(e => e.id === 'splitter') as IEnemyDef;
    const splitter = new Enemy(def, { x: 0, y: 0 });
    expect(splitter.pendingSplit).toBe(false);

    splitter.takeDamage(splitter.maxHp);
    expect(splitter.hp).toBe(0);
    expect(splitter.pendingSplit).toBe(true);
  });

  it('verifies Kamikaze triggers pendingExplosion on death', () => {
    const def = enemiesData.find(e => e.id === 'kamikaze') as IEnemyDef;
    const kamikaze = new Enemy(def, { x: 0, y: 0 });
    expect(kamikaze.pendingExplosion).toBeNull();

    kamikaze.takeDamage(kamikaze.maxHp);
    expect(kamikaze.pendingExplosion).not.toBeNull();
    expect(kamikaze.pendingExplosion?.radius).toBeGreaterThan(0);
  });
});
