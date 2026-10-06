import { IGameState, CombatCtx, Projectile, Vec2 } from '../types/interfaces';
import { Player } from '../entities/player';
import { Enemy } from '../combat/enemies/enemy';
import { Director } from '../combat/director';
import { WeaponLoader } from '../combat/weapons/weaponLoader';
import { SpatialHash } from './spatialHash';
import { AudioManager } from './audio';
import { InputManager } from './input';
import { EventBus } from './eventBus';
import { XPSystem } from '../progression/xpSystem';
import { UpgradeDraft, DraftCard } from '../progression/upgradeDraft';
import { PickupManager, PickupItem } from '../progression/pickups';
import { RunStats } from '../progression/runStats';
import { FXManager } from '../fx/fxManager';
import enemiesData from '../../data/enemies.json';

export class Engine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public state: IGameState;

  public player: Player;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];

  public spatialHash: SpatialHash;
  public director: Director;
  public weaponLoader: WeaponLoader;
  public audio: AudioManager;
  public input: InputManager;
  public xpSystem: XPSystem;
  public draftSystem: UpgradeDraft;
  public pickupManager: PickupManager;
  public stats: RunStats;
  public fx: FXManager;

  // Level up draft cards
  public currentDraftCards: DraftCard[] = [];
  public activeBoss: Enemy | null = null;

  // Loop management
  private lastTime: number = 0;
  private isRunning: boolean = false;
  public autoplayEnabled: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.state = {
      phase: 'playing',
      time: 0,
      paused: false
    };

    this.player = new Player(canvas.width / 2, canvas.height / 2);
    this.spatialHash = new SpatialHash(100);
    this.director = new Director();
    this.weaponLoader = WeaponLoader.get();
    this.audio = AudioManager.get();
    this.input = InputManager.get();
    this.xpSystem = new XPSystem();
    this.draftSystem = new UpgradeDraft(this.weaponLoader);
    this.pickupManager = new PickupManager();
    this.stats = new RunStats();
    this.fx = FXManager.get();

    // Give player initial weapon (Spark Dagger)
    const initialWeapon = this.weaponLoader.createWeapon('spark_dagger', 1);
    this.player.addWeapon(initialWeapon);

    this.initEvents();
    this.initInputHooks();
  }

  private initEvents(): void {
    const bus = EventBus.get();

    bus.on('enemy_damaged', (data: { enemy: Enemy; amount: number; pos: Vec2 }) => {
      this.stats.recordDamage(data.amount);
      this.audio.play('hit_tick');
    });

    bus.on('enemy_killed', (data: { enemy: Enemy; isElite: boolean; isBoss: boolean; pos: Vec2 }) => {
      this.stats.recordKill(data.isElite, data.isBoss);
      this.fx.spawnDeathBurst(data.pos, data.enemy.color, data.isBoss ? 35 : (data.isElite ? 22 : 10));

      if (data.isBoss) {
        this.fx.triggerHitstop(0.06);
        this.fx.addScreenshake(0.8);
        this.pickupManager.spawnChest(data.pos);
        this.activeBoss = null;
      } else if (data.isElite) {
        this.fx.triggerHitstop(0.04);
        this.fx.addScreenshake(0.4);
        this.pickupManager.spawnChest(data.pos);
      } else {
        // Normal drops
        this.pickupManager.spawnGem(data.pos, data.enemy.xpValue);
        if (Math.random() < 0.12) {
          this.pickupManager.spawnCoin(data.pos, 1);
        }
        if (Math.random() < 0.015) {
          this.pickupManager.spawnSpecial(data.pos, 'magnet');
        } else if (Math.random() < 0.02) {
          this.pickupManager.spawnSpecial(data.pos, 'meat');
        }
      }
    });

    bus.on('level_up', () => {
      this.audio.play('level_up');
      this.fx.triggerSlowMo(0.5, 0.2);
      this.openLevelUpDraft();
    });

    bus.on('player_damaged', () => {
      this.fx.addScreenshake(0.35);
    });
  }

  private initInputHooks(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (e) => {
      if (this.state.phase === 'levelup') {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        this.handleDraftClick(clickX, clickY);
      } else if (this.state.phase === 'gameover') {
        this.restartGame();
      }
    });
  }

  public openLevelUpDraft(): void {
    this.state.phase = 'levelup';
    this.state.paused = true;
    this.currentDraftCards = this.draftSystem.generateDraft(this.player);

    // If autoplay is active, immediately pick the best card
    if (this.autoplayEnabled) {
      setTimeout(() => {
        if (this.currentDraftCards.length > 0) {
          this.selectDraftCard(0);
        }
      }, 50);
    }
  }

  public selectDraftCard(index: number): void {
    if (index >= 0 && index < this.currentDraftCards.length) {
      const card = this.currentDraftCards[index];
      this.draftSystem.applySelection(this.player, card);
      this.state.phase = 'playing';
      this.state.paused = false;
      this.currentDraftCards = [];
    }
  }

  private handleDraftClick(x: number, y: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cardW = Math.min(w * 0.85, 340);
    const cardH = 90;
    const startX = (w - cardW) / 2;
    const startY = h * 0.35;

    for (let i = 0; i < this.currentDraftCards.length; i++) {
      const cy = startY + i * (cardH + 16);
      if (x >= startX && x <= startX + cardW && y >= cy && y <= cy + cardH) {
        this.selectDraftCard(i);
        break;
      }
    }
  }

  public restartGame(): void {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    this.enemies = [];
    this.projectiles = [];
    this.state.time = 0;
    this.state.phase = 'playing';
    this.state.paused = false;
    this.xpSystem = new XPSystem();
    this.stats = new RunStats();
    this.activeBoss = null;

    const initialWeapon = this.weaponLoader.createWeapon('spark_dagger', 1);
    this.player.addWeapon(initialWeapon);
  }

  public start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    const loop = (time: number) => {
      if (!this.isRunning) return;
      const dt = Math.min(0.1, (time - this.lastTime) / 1000);
      this.lastTime = time;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
  }

  public update(dt: number): void {
    if (this.state.paused || this.state.phase !== 'playing') {
      return;
    }

    // Hitstop freeze frame check
    if (this.fx.update(dt)) {
      return; // Freeze-frame active
    }

    this.state.time += dt;
    this.stats.timeSurvived = this.state.time;
    this.stats.levelReached = this.xpSystem.level;
    this.director.playerRefPos = this.player.pos;

    // 1. Player Input & Update
    let moveInput: Vec2;
    if (this.autoplayEnabled) {
      // Autoplay AI: Kite away from nearest threat or move toward gems
      moveInput = this.computeAutoplayInput();
    } else {
      moveInput = this.input.getMovement();
    }
    this.player.update(dt, moveInput);

    // Keep player in bounds
    this.player.pos.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.pos.x));
    this.player.pos.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.pos.y));

    // 2. Spatial Hash Rebuild
    this.spatialHash.clear();
    for (const e of this.enemies) {
      this.spatialHash.insert(e);
    }

    // 3. Combat Context for Weapons
    const combatCtx: CombatCtx = {
      playerPos: this.player.pos,
      playerStats: this.player.currentStats,
      enemies: this.enemies,
      time: this.state.time,
      spawnProjectile: (p: Projectile) => this.projectiles.push(p),
      spawnDamageNumber: (pos: Vec2, amount: number, isCrit: boolean) => this.fx.spawnDamageNumber(pos, amount, isCrit),
      triggerSound: (soundId: string) => this.audio.play(soundId),
      applyScreenshake: (intensity: number) => this.fx.addScreenshake(intensity),
      spatialQuery: (pos: Vec2, radius: number) => this.spatialHash.query(pos, radius)
    };

    // 4. Update Weapons
    for (const weapon of this.player.weapons) {
      weapon.update(dt, combatCtx);
    }

    // 5. Update Projectiles
    this.projectiles = this.projectiles.filter((p) => {
      p.duration -= dt;
      if (p.duration <= 0) return false;

      if (p.update) {
        p.update(dt, combatCtx);
      } else {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
      }

      // Projectile collision
      const hits = this.spatialHash.query(p.pos, p.radius + 12);
      for (const target of hits) {
        const killed = target.takeDamage(p.damage);
        this.fx.spawnDamageNumber(target.pos, p.damage, p.isCrit ?? false);
        if (p.onHit) {
          p.onHit(target, combatCtx);
        }
        p.pierce--;
        if (p.pierce < 0) return false;
      }

      return true;
    });

    // 6. Update Director & Spawn Orders
    const spawnOrders = this.director.update(dt, this.state.time);
    for (const order of spawnOrders) {
      const def = (enemiesData as any[]).find((e) => e.id === order.enemyDefId) || enemiesData[0];
      const enemy = new Enemy(def, order.pos, order.isElite, order.isBoss);
      this.enemies.push(enemy);

      if (order.isBoss) {
        this.activeBoss = enemy;
        this.audio.play('boss_horn');
        this.fx.showBossBanner('NIGHTSTALKER BOSS');
      }
    }

    // 7. Update Enemies & Behaviors
    const newChildren: Enemy[] = [];
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) return false;

      e.update(dt, this.player.pos);

      // Handle Splitter offspring spawn
      if (e.pendingSplit) {
        e.pendingSplit = false;
        const smallDef = (enemiesData as any[]).find((ed) => ed.id === 'splitter_small') || enemiesData[4];
        newChildren.push(new Enemy(smallDef, { x: e.pos.x - 12, y: e.pos.y }));
        newChildren.push(new Enemy(smallDef, { x: e.pos.x + 12, y: e.pos.y }));
      }

      // Handle Kamikaze Explosion
      if (e.pendingExplosion) {
        const exp = e.pendingExplosion;
        e.pendingExplosion = null;
        this.fx.addScreenshake(0.6);
        this.fx.spawnDeathBurst(e.pos, '#f59e0b', 24);
        const pDist = Math.hypot(this.player.pos.x - e.pos.x, this.player.pos.y - e.pos.y);
        if (pDist <= exp.radius) {
          this.player.takeDamage(exp.damage);
        }
      }

      // Player collision damage
      const pDist = Math.hypot(this.player.pos.x - e.pos.x, this.player.pos.y - e.pos.y);
      if (pDist < this.player.radius + 12 * e.scale) {
        const dead = this.player.takeDamage(e.damage);
        if (dead) {
          this.state.phase = 'gameover';
        }
      }

      return true;
    });
    this.enemies.push(...newChildren);

    // 8. Update Pickups & Collection
    this.pickupManager.update(dt, this.player, (item: PickupItem) => {
      this.handleItemCollection(item);
    });
  }

  private handleItemCollection(item: PickupItem): void {
    switch (item.type) {
      case 'xp_gem': {
        this.audio.play('gem_pickup');
        this.xpSystem.addXP(item.value, this.player.currentStats.xpMul);
        break;
      }
      case 'coin': {
        this.audio.play('gem_pickup');
        this.stats.recordCoin(item.value);
        break;
      }
      case 'chest': {
        this.audio.play('chest_open');
        this.stats.recordCoin(25);
        // Evolution check: checks if any Lv8 weapon evolves!
        for (let i = 0; i < this.player.weapons.length; i++) {
          const w = this.player.weapons[i];
          const evolved = this.weaponLoader.evolveWeapon(w, this.player.passives);
          if (evolved) {
            this.player.weapons[i] = evolved;
            this.stats.recordEvolution(evolved.def.name);
            this.fx.addScreenshake(0.6);
            EventBus.get().emit('evolution_triggered', {
              weaponId: w.id,
              evolvedId: evolved.id
            });
            break;
          }
        }
        break;
      }
      case 'magnet': {
        this.audio.play('gem_pickup');
        this.pickupManager.triggerGlobalMagnet();
        break;
      }
      case 'meat': {
        this.audio.play('gem_pickup');
        this.player.heal(30);
        break;
      }
    }
  }

  private computeAutoplayInput(): Vec2 {
    let avoidX = 0;
    let avoidY = 0;
    let gemTarget: Vec2 | null = null;
    let nearestGemDist = 99999;

    // Avoid nearby enemies within 120px
    for (const e of this.enemies) {
      const dx = this.player.pos.x - e.pos.x;
      const dy = this.player.pos.y - e.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120 && dist > 0) {
        avoidX += (dx / dist) * (120 - dist);
        avoidY += (dy / dist) * (120 - dist);
      }
    }

    if (Math.hypot(avoidX, avoidY) > 10) {
      const len = Math.hypot(avoidX, avoidY);
      return { x: avoidX / len, y: avoidY / len };
    }

    // Seek nearest gem
    for (const g of this.pickupManager.items) {
      const dist = Math.hypot(g.pos.x - this.player.pos.x, g.pos.y - this.player.pos.y);
      if (dist < nearestGemDist) {
        nearestGemDist = dist;
        gemTarget = g.pos;
      }
    }

    if (gemTarget) {
      const dx = gemTarget.x - this.player.pos.x;
      const dy = gemTarget.y - this.player.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      return { x: dx / dist, y: dy / dist };
    }

    // Circular roam
    const t = this.state.time;
    return { x: Math.cos(t * 0.8), y: Math.sin(t * 0.8) };
  }

  public render(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.save();
    // Apply Screenshake offset
    this.ctx.translate(this.fx.shakeOffset.x, this.fx.shakeOffset.y);

    // Clear dark indigo arena (#0d1020) per Art Bible
    this.ctx.fillStyle = '#0d1020';
    this.ctx.fillRect(0, 0, w, h);

    // Arena subtle grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Pickups
    this.pickupManager.render(this.ctx);

    // Weapons ambient render (auras, orbits, laser beams)
    for (const weapon of this.player.weapons) {
      if ((weapon as any).render) {
        (weapon as any).render(this.ctx, this.player.pos);
      }
    }

    // Projectiles
    for (const p of this.projectiles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      e.render(this.ctx);
    }

    // Player
    this.player.render(this.ctx);

    // FX overlay (particles, floating damage numbers, vignette)
    const bossHpPercent = this.activeBoss ? this.activeBoss.hp / this.activeBoss.maxHp : undefined;
    this.fx.render(this.ctx, w, h, this.player.currentStats.hp / this.player.currentStats.maxHp, bossHpPercent);

    // Virtual Joystick UI
    this.input.renderJoystick(this.ctx);

    this.ctx.restore();

    // HUD (always fixed)
    this.renderHUD();

    // Modals
    if (this.state.phase === 'levelup') {
      this.renderLevelUpModal();
    } else if (this.state.phase === 'gameover') {
      this.renderGameOverModal();
    }
  }

  private renderHUD(): void {
    const w = this.canvas.width;

    // 1. Top XP Bar
    const xpPercent = Math.min(1.0, this.xpSystem.currentXP / this.xpSystem.targetXP);
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.fillRect(0, 0, w, 8);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.shadowColor = '#22d3ee';
    this.ctx.shadowBlur = 6;
    this.ctx.fillRect(0, 0, w * xpPercent, 8);
    this.ctx.shadowBlur = 0;

    // 2. Timer & Level Display
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.stats.formatTime(this.state.time), w / 2, 28);

    this.ctx.textAlign = 'left';
    this.ctx.font = '12px "Inter", sans-serif';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText(`LV ${this.xpSystem.level}`, 16, 26);

    // 3. Player Health Bar
    const hpPercent = Math.max(0, this.player.currentStats.hp / this.player.currentStats.maxHp);
    const hpBarW = 120;
    const hpBarH = 8;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(16, 34, hpBarW, hpBarH);
    this.ctx.fillStyle = hpPercent > 0.3 ? '#22c55e' : '#ef4444';
    this.ctx.fillRect(16, 34, hpBarW * hpPercent, hpBarH);

    // 4. Kills & Coins
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillText(`☠ ${this.stats.totalKills}   🪙 ${this.stats.coinsEarned}`, w - 16, 26);

    // 5. Active Weapon Icons (Bottom Left)
    let iconX = 16;
    const iconY = this.canvas.height - 24;
    for (const w of this.player.weapons) {
      this.ctx.beginPath();
      this.ctx.arc(iconX, iconY, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = (w as any).def?.evolution === null ? '#f59e0b' : '#38bdf8';
      this.ctx.fill();
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 9px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(w.level.toString(), iconX, iconY);
      iconX += 26;
    }
  }

  private renderLevelUpModal(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark backdrop
    this.ctx.fillStyle = 'rgba(5, 7, 15, 0.75)';
    this.ctx.fillRect(0, 0, w, h);

    // Title
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 24px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('LEVEL UP!', w / 2, h * 0.25);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '13px "Inter", sans-serif';
    this.ctx.fillText('Select an Upgrade', w / 2, h * 0.29);

    // Cards
    const cardW = Math.min(w * 0.85, 340);
    const cardH = 90;
    const startX = (w - cardW) / 2;
    const startY = h * 0.35;

    for (let i = 0; i < this.currentDraftCards.length; i++) {
      const card = this.currentDraftCards[i];
      const cy = startY + i * (cardH + 16);

      // Card box
      this.ctx.fillStyle = '#1e293b';
      this.ctx.strokeStyle = card.color;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.roundRect(startX, cy, cardW, cardH, 8);
      this.ctx.fill();
      this.ctx.stroke();

      // Card Title
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 15px "Inter", sans-serif';
      this.ctx.fillText(card.title, startX + 16, cy + 28);

      // Card Level Badge
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = card.color;
      this.ctx.font = 'bold 12px "Inter", sans-serif';
      const badge = card.currentLevel > 0 ? `Lv ${card.currentLevel} → ${card.nextLevel}` : 'NEW!';
      this.ctx.fillText(badge, startX + cardW - 16, cy + 28);

      // Card Description
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '12px "Inter", sans-serif';
      this.ctx.fillText(card.description, startX + 16, cy + 56);
    }
  }

  private renderGameOverModal(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const summary = this.stats.getSummary();

    this.ctx.fillStyle = 'rgba(5, 7, 15, 0.85)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = '#ef4444';
    this.ctx.font = 'bold 28px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', w / 2, h * 0.28);

    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = '15px "Inter", sans-serif';
    this.ctx.fillText(`Survived: ${summary.timeSurvived}`, w / 2, h * 0.38);
    this.ctx.fillText(`Level: ${summary.levelReached}`, w / 2, h * 0.43);
    this.ctx.fillText(`Enemies Vanquished: ${summary.totalKills}`, w / 2, h * 0.48);
    this.ctx.fillText(`Total Damage: ${summary.totalDamageDealt}`, w / 2, h * 0.53);
    this.ctx.fillText(`Coins Collected: 🪙 ${summary.coinsEarned}`, w / 2, h * 0.58);

    if (summary.evolutions.length > 0) {
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillText(`Evolutions: ${summary.evolutions.join(', ')}`, w / 2, h * 0.63);
    }

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 14px "Inter", sans-serif';
    this.ctx.fillText('CLICK ANYWHERE TO REPLAY', w / 2, h * 0.74);
  }
}
