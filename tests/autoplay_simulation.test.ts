import { describe, it, expect } from 'vitest';
import { Player } from '../src/entities/player';
import { Enemy } from '../src/combat/enemies/enemy';
import { Director } from '../src/combat/director';
import { WeaponLoader } from '../src/combat/weapons/weaponLoader';
import { SpatialHash } from '../src/core/spatialHash';
import { XPSystem } from '../src/progression/xpSystem';
import { UpgradeDraft } from '../src/progression/upgradeDraft';
import { PickupManager } from '../src/progression/pickups';
import { RunStats } from '../src/progression/runStats';
import { FXManager } from '../src/fx/fxManager';
import { EventBus } from '../src/core/eventBus';
import { CombatCtx, Projectile, Vec2 } from '../src/types/interfaces';
import enemiesData from '../data/enemies.json';

describe('2-Minute Autoplay Simulation (Headless Playtest)', () => {
  it('runs a continuous 2-minute (120s) simulated combat session without crashes', () => {
    EventBus.get().clear();

    const player = new Player(400, 400);
    const spatialHash = new SpatialHash(100);
    const director = new Director();
    const weaponLoader = WeaponLoader.get();
    const xpSystem = new XPSystem();
    const draftSystem = new UpgradeDraft(weaponLoader);
    const pickupManager = new PickupManager();
    const stats = new RunStats();
    const fx = new FXManager();

    EventBus.get().on('enemy_damaged', (data: { amount: number }) => {
      stats.recordDamage(data.amount);
    });

    EventBus.get().on('enemy_killed', (data: { isElite: boolean; isBoss: boolean; pos: Vec2; enemy: Enemy }) => {
      stats.recordKill(data.isElite, data.isBoss);
      pickupManager.spawnGem(data.pos, data.enemy.xpValue);
    });

    // Start with Spark Dagger
    player.addWeapon(weaponLoader.createWeapon('spark_dagger', 1));

    let enemies: Enemy[] = [];
    let projectiles: Projectile[] = [];
    let simTime = 0;
    const dt = 1 / 60; // 60fps fixed step
    const totalFrames = 120 * 60; // 7,200 frames = 2 minutes

    let levelUpsTriggered = 0;

    for (let frame = 0; frame < totalFrames; frame++) {
      simTime += dt;
      stats.timeSurvived = simTime;
      director.playerRefPos = player.pos;

      // 1. Move Player: seek nearest gem or maintain gentle spacing
      let moveInput: Vec2 = { x: 0, y: 0 };
      if (pickupManager.items.length > 0) {
        let closestGem = pickupManager.items[0];
        let closestDist = Math.hypot(closestGem.pos.x - player.pos.x, closestGem.pos.y - player.pos.y);
        for (let i = 1; i < pickupManager.items.length; i++) {
          const item = pickupManager.items[i];
          const d = Math.hypot(item.pos.x - player.pos.x, item.pos.y - player.pos.y);
          if (d < closestDist) {
            closestDist = d;
            closestGem = item;
          }
        }
        const gdx = closestGem.pos.x - player.pos.x;
        const gdy = closestGem.pos.y - player.pos.y;
        const glen = Math.hypot(gdx, gdy) || 1;
        moveInput = { x: gdx / glen, y: gdy / glen };
      } else {
        const angle = simTime * 0.5;
        moveInput = { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 };
      }

      player.update(dt, moveInput);

      // Keep player inside arena boundaries
      player.pos.x = Math.max(50, Math.min(750, player.pos.x));
      player.pos.y = Math.max(50, Math.min(750, player.pos.y));

      // 2. Spatial Hash
      spatialHash.clear();
      for (const e of enemies) {
        spatialHash.insert(e);
      }

      // 3. Combat Ctx
      const combatCtx: CombatCtx = {
        playerPos: player.pos,
        playerStats: player.currentStats,
        enemies,
        time: simTime,
        spawnProjectile: (p: Projectile) => projectiles.push(p),
        spawnDamageNumber: (pos: Vec2, amount: number, isCrit: boolean) => fx.spawnDamageNumber(pos, amount, isCrit),
        triggerSound: () => {},
        applyScreenshake: (intensity: number) => fx.addScreenshake(intensity),
        spatialQuery: (pos: Vec2, radius: number) => spatialHash.query(pos, radius)
      };

      // 4. Update Weapons
      for (const weapon of player.weapons) {
        weapon.update(dt, combatCtx);
      }

      // 5. Update Projectiles
      projectiles = projectiles.filter((p) => {
        p.duration -= dt;
        if (p.duration <= 0) return false;
        if (p.update) {
          p.update(dt, combatCtx);
        } else {
          p.pos.x += p.vel.x * dt;
          p.pos.y += p.vel.y * dt;
        }

        const hits = spatialHash.query(p.pos, p.radius + 14);
        for (const target of hits) {
          target.takeDamage(p.damage);
          if (p.onHit) {
            p.onHit(target, combatCtx);
          }
          p.pierce--;
          if (p.pierce < 0) return false;
        }
        return true;
      });

      // 6. Update Director
      const orders = director.update(dt, simTime);
      for (const order of orders) {
        const def = (enemiesData as any[]).find((e) => e.id === order.enemyDefId) || enemiesData[0];
        enemies.push(new Enemy(def, order.pos, order.isElite, order.isBoss));
      }

      // 7. Update Enemies
      const splitChildren: Enemy[] = [];
      enemies = enemies.filter((e) => {
        if (e.hp <= 0) return false;
        e.update(dt, player.pos);
        if (e.pendingSplit) {
          e.pendingSplit = false;
          const smallDef = (enemiesData as any[]).find((ed) => ed.id === 'splitter_small') || enemiesData[4];
          splitChildren.push(new Enemy(smallDef, { x: e.pos.x - 10, y: e.pos.y }));
          splitChildren.push(new Enemy(smallDef, { x: e.pos.x + 10, y: e.pos.y }));
        }
        return true;
      });
      enemies.push(...splitChildren);

      // 8. Update Pickups & XP
      pickupManager.update(dt, player, (item) => {
        if (item.type === 'xp_gem') {
          const leveled = xpSystem.addXP(item.value, player.currentStats.xpMul);
          if (leveled) {
            levelUpsTriggered++;
            // Automatically draft upgrade card
            const cards = draftSystem.generateDraft(player);
            if (cards.length > 0) {
              draftSystem.applySelection(player, cards[0]);
            }
          }
        }
      });

      // 9. FX update
      fx.update(dt);
    }

    // Playtest verification assertions
    expect(simTime).toBeCloseTo(120, 0);
    expect(stats.totalDamageDealt).toBeGreaterThan(1000);
    expect(stats.totalKills).toBeGreaterThan(10);
    expect(xpSystem.level).toBeGreaterThan(1);
    expect(levelUpsTriggered).toBeGreaterThan(0);
    expect(player.weapons.length).toBeGreaterThanOrEqual(1);
    expect(player.weapons.length).toBeLessThanOrEqual(6);
  });
});
