# NIGHTFALL SURVIVORS — GAME DESIGN DOC (v1.0)
### Phase 0 deliverable · Status: DRAFT — prakhar reviews, corrects, approves
### Working title (prakhar picks final)

---

## 1. HIGH CONCEPT

Top-down arena survival for mobile. One thumb moves you; your weapons fire on their
own. Endless monster hordes, XP gems, level-up upgrade drafts, evolving weapons.
Survive. Sessions target 15 minutes. Portrait orientation, 60fps, Hindi-first UI.

**Design pillars:**
1. **One-thumb depth** — trivial to start, deep to master (positioning > reflexes)
2. **Numbers go up** — constant progression inside a run (levels, evolutions) and between runs (meta shop)
3. **Juice everywhere** — every kill feels good: particles, screenshake, damage numbers
4. **Content as data** — weapons/enemies/upgrades are JSON, not code. The game grows by data.

---

## 2. CORE LOOPS

- **Moment (seconds):** dodge → weapons auto-fire → enemies die → collect gems
- **Session (minutes):** survive waves → level up → draft 1-of-3 upgrades → evolve weapons → boss at 5/10/15 min → die or survive 15 min (victory lap: endless after)
- **Meta (days):** runs earn coins → buy permanent upgrades → new characters/maps unlock → daily challenge

---

## 3. PLAYER

- **Stats:** HP, Move Speed, Damage %, Attack Speed %, Crit %, Magnet Radius, Armor, XP Gain %, Luck %, Coin Gain %
- **Controls:** virtual joystick (left thumb, dynamic origin). Keyboard WASD/arrows on desktop. No buttons — attacks are automatic.
- **Characters (launch 3, data-driven for more):** balanced / fast-fragile / slow-tanky, each with a starting weapon and a small passive bonus.

## 4. WEAPONS SYSTEM (data-driven — the heart of the game)

**Launch set (12):** Spark Dagger (nearest-target projectile) · Ember Orbit (orbitals) ·
Frost Nova (radial pulse) · Chain Lightning · Boomerang Blade · Venom Cloud (DoT zone) ·
Prism Beam (rotating beam) · Meteor Call (random strikes) · Thorn Guard (contact damage) ·
Gale Blades (spiral) · Moon Aura (DoT aura) · Howl Pack (summon wolves — minions)

**Rules:**
- Max 6 weapons + 6 passives per run (forces build choices)
- Each weapon: 8 levels, scaling damage/count/area per level (all in data)
- **Evolution:** max-level weapon + matching passive owned → evolves on next chest (e.g. Spark Dagger + Might = Storm Dagger). Evolved weapons are run-defining.
- New weapon drafts appear only via level-up; duplicates upgrade existing

**Passives (8):** Might (+damage) · Swift Boots (+move/attack speed) · Magnet Charm ·
Vitality (+max HP/regen) · Greed (+coins) · Wisdom (+XP) · Iron Plate (armor) ·
Clover (luck/crit)

## 5. ENEMIES & DIRECTOR

**Types (launch 12, data-driven):** Chaser · Dasher (telegraphed lunge) · Tank ·
Splitter (splits into 2 small) · Spitter (ranged) · Wraith (fast, fragile) ·
Brute (slow, huge HP) · Leech (drains XP gems!) · Kamikaze (explodes) · Shieldbearer
(frontal armor) · Elites (gold-tinted, 10x HP, drop chests) · Bosses

**Director (time-based spawn budget):**
- Budget scales exponentially; composition shifts by minute (early chasers → mixed → specials)
- Events: swarm rings (min 3, 8, 13), elite packs (min 4, 9, 14), **bosses at 5 / 10 / 15**
- Post-15:00 endless escalation (victory screen at 15:00, keep playing = endless)
- Difficulty modifiers per map

## 6. PICKUPS & ECONOMY

- **XP gems** (3 tiers by enemy strength) · **Coins** (meta currency) · **Chests** (evolution trigger + bonus) · **Magnet** (vacuums gems) · **Meat** (heal) · **Bomb** (screen clear, rare)
- In-run: gems → levels. Between runs: coins → permanent upgrades.

## 7. META-PROGRESSION (retention engine)

- **Coin shop:** permanent +stat upgrades (20 tiers each), new characters, new maps — all coin-priced on a curve tuned so ~10 runs unlocks the first big purchase
- **Achievements:** 40 launch achievements (kill counts, evolutions, survival times) with coin rewards
- **Stats screen:** lifetime kills, best time, favorite weapon — shareable card (viral hook)
- **Daily challenge:** fixed seed + modifiers, one attempt, leaderboard (n8n rotates)

## 8. JUICE & GAME FEEL (non-negotiable)

- Damage numbers (crit = bigger, gold) · enemy hit-flash (white, 80ms) · death particles (pooled) ·
  screenshake scaled by event (elite kill > normal) · hitstop 40ms on elite/boss kill ·
  knockback on heavy hits · level-up slow-mo + fanfare · low-HP vignette pulse ·
  pickup magnet stream effect · boss intro banner + health bar
- **Feel targets:** movement must feel instant (no accel lag); joystick deadzone tuned; 0 input latency tolerance

## 9. ART DIRECTION BIBLE

- **Style:** flat-shaded vector, dark arena (#0d1020-ish) with neon accent palette per map
- **Palette (locked):** background deep indigo · player cyan · XP gems green→blue→purple tiers ·
  enemies magenta/red family · elites gold · damage numbers white/gold · UI bone-white on dark
- **All art procedural** (code-generated shapes) in one consistent style — no mixed sources
- Enemies readable at a glance: silhouette + color = behavior (spiky = dasher, big = tank)
- Map themes (launch 3): Ashen Hollow (embers) · Drowned Court (rain/teal) · Neon Wastes (magenta grid)

## 10. AUDIO DIRECTION

- WebAudio procedural synth: per-weapon fire sounds (short, non-annoying at 10/sec), hit ticks, gem pickup arpeggio (pitch rises with combo), level-up sting, boss horn
- Adaptive music: intensity layers follow enemy count (procedural loop, no licensed tracks)
- Mute + volume in settings; all sounds < 100ms latency

## 11. UI/UX SCREENS

Menu (Play · Shop · Achievements · Stats · Settings · Daily) → Character select →
Map select → HUD (HP bar, timer, level/XP bar, weapon icons, coin count, pause) →
Level-up draft (3 cards, pause game) → Pause → Game over (stats + share card + coins earned) →
Shop · Achievements · Stats · Settings (language, volume, joystick side, quality mode)

**i18n:** Hindi-first, English second; all strings keyed, no hardcoded text.

## 12. TECHNICAL — FROZEN MODULE INTERFACES

> These interfaces are FROZEN after prakhar approves this doc. No wave changes them
> without a documented migration reviewed by Rem.

```typescript
// Core
interface IGameState { phase: 'menu'|'playing'|'paused'|'levelup'|'gameover'; time: number; paused: boolean; }
interface IStats { hp: number; maxHp: number; moveSpeed: number; damageMul: number; attackSpeedMul: number; critChance: number; magnetRadius: number; armor: number; xpMul: number; luck: number; coinMul: number; }

// Data-driven content (all loaded from JSON)
interface IWeaponDef { id: string; name: string; levels: IWeaponLevel[8]; evolution: { requiresPassive: string; evolvesTo: string } | null; }
interface IEnemyDef { id: string; hp: number; speed: number; damage: number; xpValue: number; behavior: 'chase'|'dash'|'tank'|'split'|'ranged'|'kamikaze'; scale: number; color: string; }
interface IPassiveDef { id: string; name: string; levels: number[8]; stat: keyof IStats; }
interface IWaveEvent { at: number; type: 'swarm'|'elite'|'boss'; enemyId: string; count: number; }

// Runtime
interface IWeapon { def: IWeaponDef; level: number; cooldown: number; update(dt: number, ctx: CombatCtx): void; }
interface IEnemy { def: IEnemyDef; hp: number; pos: Vec2; vel: Vec2; update(dt: number, player: Vec2): void; takeDamage(n: number): void; }
interface IDirector { update(dt: number, time: number): SpawnOrder[]; }
interface ISaveData { coins: number; upgrades: Record<string, number>; unlockedChars: string[]; unlockedMaps: string[]; achievements: string[]; settings: ISettings; }
```

**Performance budgets (hard):** 60fps · 300 active enemies · < 150MB RAM · object pooling for
enemies/particles/projectiles (zero per-frame allocation in hot loop) · spatial hash for collisions.

## 13. BALANCE TARGETS (v1)

- New player survives ~4–6 min first run; feels powerful by run 3
- Average winning run: 15 min; upgrade drafts ~18–22 per run
- Coin economy: ~120 coins/run → first shop tier (500) in ~4–5 runs
- No single weapon > 35% of a winning build's damage (diversity enforced by data review)

## 14. CONTENT PLAN (the burn)

- Phase 3 target: 50+ weapons · 100+ enemies · 200+ upgrades/passive combos · 40 achievements — all as validated JSON
- n8n nightly: +10 generated entries/night post-launch, auto-validated against schemas

---

## OPEN QUESTIONS FOR PRAKHAR
1. Final game name?
2. Art gut-check: dark-neon flat style — or do you want something brighter/friendlier?
3. Hindi-first UI confirmed? Any other launch language priority?
4. 15-minute sessions — or shorter (10) for mobile?
