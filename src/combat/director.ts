import { IDirector, SpawnOrder, Vec2 } from '../types/interfaces';
import enemiesData from '../../data/enemies.json';

export class Director implements IDirector {
  private spawnInterval: number = 0.8; // Time between regular spawn pulses
  private timeSinceLastPulse: number = 0;
  private triggeredEvents: Set<string> = new Set();
  public playerRefPos: Vec2 = { x: 400, y: 300 };

  // Exponential spawn budget curve:
  // Base budget of 3 points at min 0, scaling exponentially with time.
  public calculateBudget(timeInSeconds: number): number {
    const minutes = timeInSeconds / 60;
    // B(t) = 3 * (1.28 ^ minutes) + (minutes * 1.5)
    return Math.floor(3 * Math.pow(1.28, minutes) + minutes * 1.5);
  }

  // Composition table per minute
  public getAvailableEnemyIds(timeInSeconds: number): string[] {
    const min = Math.floor(timeInSeconds / 60);
    if (min < 1) {
      return ['chaser'];
    } else if (min < 2) {
      return ['chaser', 'dasher', 'wraith'];
    } else if (min < 3) {
      return ['chaser', 'dasher', 'tank', 'splitter'];
    } else if (min < 5) {
      return ['chaser', 'dasher', 'tank', 'splitter', 'spitter', 'kamikaze'];
    } else if (min < 10) {
      return ['dasher', 'tank', 'splitter', 'spitter', 'wraith', 'kamikaze', 'shieldbearer'];
    } else {
      return ['tank', 'splitter', 'spitter', 'wraith', 'brute', 'kamikaze', 'shieldbearer'];
    }
  }

  public update(dt: number, time: number): SpawnOrder[] {
    const orders: SpawnOrder[] = [];
    this.timeSinceLastPulse += dt;

    // 1. Check Scheduled Events
    const checkScheduledEvents = (targetSec: number, eventKey: string, handler: () => void) => {
      if (time >= targetSec && !this.triggeredEvents.has(eventKey)) {
        this.triggeredEvents.add(eventKey);
        handler();
      }
    };

    // Swarm rings: 3:00 (180s), 8:00 (480s), 13:00 (780s)
    [180, 480, 780].forEach((t) => {
      checkScheduledEvents(t, `swarm_${t}`, () => {
        const swarmCount = 32;
        const radius = 380;
        for (let i = 0; i < swarmCount; i++) {
          const angle = (i * Math.PI * 2) / swarmCount;
          orders.push({
            enemyDefId: 'chaser',
            pos: {
              x: this.playerRefPos.x + Math.cos(angle) * radius,
              y: this.playerRefPos.y + Math.sin(angle) * radius
            }
          });
        }
      });
    });

    // Elite packs: 4:00 (240s), 9:00 (540s), 14:00 (840s)
    [240, 540, 840].forEach((t) => {
      checkScheduledEvents(t, `elite_${t}`, () => {
        const eliteCount = 4;
        for (let i = 0; i < eliteCount; i++) {
          const angle = (i * Math.PI * 2) / eliteCount;
          orders.push({
            enemyDefId: 'tank',
            pos: {
              x: this.playerRefPos.x + Math.cos(angle) * 350,
              y: this.playerRefPos.y + Math.sin(angle) * 350
            },
            isElite: true
          });
        }
      });
    });

    // Bosses: 5:00 (300s), 10:00 (600s), 15:00 (900s)
    [300, 600, 900].forEach((t) => {
      checkScheduledEvents(t, `boss_${t}`, () => {
        orders.push({
          enemyDefId: 'boss_nightstalker',
          pos: {
            x: this.playerRefPos.x,
            y: this.playerRefPos.y - 360
          },
          isBoss: true
        });
      });
    });

    // 2. Continuous Budget Spawning Pulse
    // Interval dynamically tightens as minutes increase (from 0.8s down to 0.3s)
    const currentInterval = Math.max(0.3, this.spawnInterval - (time / 900) * 0.5);
    if (this.timeSinceLastPulse >= currentInterval) {
      this.timeSinceLastPulse = 0;
      const budget = this.calculateBudget(time);
      const availableIds = this.getAvailableEnemyIds(time);

      let spent = 0;
      while (spent < budget) {
        const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
        const def = (enemiesData as any[]).find((e) => e.id === randomId) || enemiesData[0];
        const cost = Math.max(1, def.xpValue);

        // Spawn on edge of arena around player
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 360 + Math.random() * 80;

        orders.push({
          enemyDefId: randomId,
          pos: {
            x: this.playerRefPos.x + Math.cos(spawnAngle) * spawnDist,
            y: this.playerRefPos.y + Math.sin(spawnAngle) * spawnDist
          }
        });

        spent += cost;
      }
    }

    return orders;
  }
}
