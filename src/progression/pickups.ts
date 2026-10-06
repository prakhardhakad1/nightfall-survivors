import { Vec2, IStats } from '../types/interfaces';
import { Player } from '../entities/player';
import { WeaponLoader } from '../combat/weapons/weaponLoader';
import { EventBus } from '../core/eventBus';

export type PickupType = 'xp_gem' | 'coin' | 'chest' | 'magnet' | 'meat';

export interface PickupItem {
  id: string;
  type: PickupType;
  pos: Vec2;
  tier: number; // 1, 2, or 3 for gems
  value: number;
  radius: number;
  beingVacuumed: boolean;
}

export class PickupManager {
  public items: PickupItem[] = [];

  public spawnGem(pos: Vec2, xpValue: number): void {
    let tier = 1;
    let value = 1;
    if (xpValue >= 25) {
      tier = 3;
      value = 25;
    } else if (xpValue >= 5) {
      tier = 2;
      value = 5;
    }

    this.items.push({
      id: `gem_${Date.now()}_${Math.random()}`,
      type: 'xp_gem',
      pos: { x: pos.x + (Math.random() - 0.5) * 10, y: pos.y + (Math.random() - 0.5) * 10 },
      tier,
      value,
      radius: tier === 3 ? 7 : (tier === 2 ? 6 : 4),
      beingVacuumed: false
    });
  }

  public spawnCoin(pos: Vec2, value: number = 1): void {
    this.items.push({
      id: `coin_${Date.now()}_${Math.random()}`,
      type: 'coin',
      pos: { ...pos },
      tier: 1,
      value,
      radius: 6,
      beingVacuumed: false
    });
  }

  public spawnChest(pos: Vec2): void {
    this.items.push({
      id: `chest_${Date.now()}_${Math.random()}`,
      type: 'chest',
      pos: { ...pos },
      tier: 1,
      value: 1,
      radius: 14,
      beingVacuumed: false
    });
  }

  public spawnSpecial(pos: Vec2, type: 'magnet' | 'meat'): void {
    this.items.push({
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      pos: { ...pos },
      tier: 1,
      value: 1,
      radius: 10,
      beingVacuumed: false
    });
  }

  public triggerGlobalMagnet(): void {
    for (const item of this.items) {
      item.beingVacuumed = true;
    }
  }

  public update(dt: number, player: Player, onCollect: (item: PickupItem) => void): void {
    const pPos = player.pos;
    const magRadius = player.currentStats.magnetRadius;

    this.items = this.items.filter((item) => {
      const dx = pPos.x - item.pos.x;
      const dy = pPos.y - item.pos.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Collection check
      if (dist < player.radius + item.radius) {
        onCollect(item);
        return false; // Removed
      }

      // Magnet attraction
      if (item.beingVacuumed || dist <= magRadius) {
        const flySpeed = item.beingVacuumed ? 600 : Math.max(220, 480 - dist);
        item.pos.x += (dx / dist) * flySpeed * dt;
        item.pos.y += (dy / dist) * flySpeed * dt;
      }

      return true;
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const item of this.items) {
      ctx.save();
      ctx.translate(item.pos.x, item.pos.y);

      switch (item.type) {
        case 'xp_gem': {
          ctx.beginPath();
          // Diamond polygon
          const r = item.radius;
          ctx.moveTo(0, -r);
          ctx.lineTo(r, 0);
          ctx.lineTo(0, r);
          ctx.lineTo(-r, 0);
          ctx.closePath();

          if (item.tier === 3) {
            ctx.fillStyle = '#a855f7'; // Purple Tier 3
            ctx.shadowColor = '#c084fc';
          } else if (item.tier === 2) {
            ctx.fillStyle = '#38bdf8'; // Blue Tier 2
            ctx.shadowColor = '#7dd3fc';
          } else {
            ctx.fillStyle = '#22c55e'; // Green Tier 1
            ctx.shadowColor = '#4ade80';
          }
          ctx.shadowBlur = 6;
          ctx.fill();
          break;
        }

        case 'coin': {
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#eab308';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          break;
        }

        case 'chest': {
          // Treasure chest icon
          ctx.beginPath();
          ctx.rect(-item.radius, -item.radius * 0.7, item.radius * 2, item.radius * 1.4);
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }

        case 'magnet': {
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 8;
          ctx.fill();
          break;
        }

        case 'meat': {
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 8;
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }
}
