import { Player } from '../entities/player';
import { WeaponLoader } from '../combat/weapons/weaponLoader';
import { IPassiveDef } from '../types/interfaces';
import passivesData from '../../data/passives.json';

export interface DraftCard {
  id: string;
  type: 'weapon_upgrade' | 'weapon_new' | 'passive_upgrade' | 'passive_new' | 'consumable';
  title: string;
  description: string;
  currentLevel: number;
  nextLevel: number;
  color: string;
}

export class UpgradeDraft {
  private loader: WeaponLoader;
  private passives: IPassiveDef[];

  constructor(loader: WeaponLoader = WeaponLoader.get()) {
    this.loader = loader;
    this.passives = passivesData as IPassiveDef[];
  }

  public generateDraft(player: Player): DraftCard[] {
    const candidates: DraftCard[] = [];

    // 1. Upgrades for owned weapons (< 8)
    for (const w of player.weapons) {
      if (w.level < 8) {
        const def = this.loader.getDef(w.id);
        if (def) {
          const nextLvl = def.levels[w.level];
          candidates.push({
            id: w.id,
            type: 'weapon_upgrade',
            title: def.name,
            description: nextLvl.description,
            currentLevel: w.level,
            nextLevel: w.level + 1,
            color: '#38bdf8'
          });
        }
      }
    }

    // 2. Upgrades for owned passives (< 8)
    player.passives.forEach((lvl, passiveId) => {
      if (lvl < 8) {
        const def = this.passives.find((p) => p.id === passiveId);
        if (def) {
          candidates.push({
            id: def.id,
            type: 'passive_upgrade',
            title: def.name,
            description: `Boosts ${String(def.stat)} to tier ${lvl + 1}`,
            currentLevel: lvl,
            nextLevel: lvl + 1,
            color: '#a855f7'
          });
        }
      }
    });

    // 3. New weapons (if < 6 slots)
    if (player.weapons.length < 6) {
      const ownedWeaponIds = new Set(player.weapons.map((w) => w.id));
      const launchDefs = this.loader.getLaunchWeaponDefs();
      for (const def of launchDefs) {
        if (!ownedWeaponIds.has(def.id)) {
          candidates.push({
            id: def.id,
            type: 'weapon_new',
            title: `NEW: ${def.name}`,
            description: def.levels[0].description,
            currentLevel: 0,
            nextLevel: 1,
            color: '#facc15'
          });
        }
      }
    }

    // 4. New passives (if < 6 slots)
    if (player.passives.size < 6) {
      for (const p of this.passives) {
        if (!player.passives.has(p.id)) {
          candidates.push({
            id: p.id,
            type: 'passive_new',
            title: `NEW: ${p.name}`,
            description: `Increases ${String(p.stat)}`,
            currentLevel: 0,
            nextLevel: 1,
            color: '#ec4899'
          });
        }
      }
    }

    // Fallbacks if pool exhausted
    if (candidates.length < 3) {
      candidates.push({
        id: 'gold_pouch',
        type: 'consumable',
        title: 'Bag of Gold',
        description: 'Instantly grants 50 gold coins.',
        currentLevel: 0,
        nextLevel: 1,
        color: '#eab308'
      });
      candidates.push({
        id: 'hearty_meat',
        type: 'consumable',
        title: 'Floor Meat',
        description: 'Heals 50 HP immediately.',
        currentLevel: 0,
        nextLevel: 1,
        color: '#ef4444'
      });
    }

    // Shuffle and pick 3 cards, with 65% probability favoring upgrades over new
    const upgrades = candidates.filter((c) => c.type.includes('upgrade'));
    const newItems = candidates.filter((c) => !c.type.includes('upgrade'));

    const picked: DraftCard[] = [];
    const usedIds = new Set<string>();

    const tryAdd = (card: DraftCard) => {
      if (!usedIds.has(card.id)) {
        usedIds.add(card.id);
        picked.push(card);
      }
    };

    // Prioritize owned upgrades first if available
    for (const u of upgrades.sort(() => Math.random() - 0.5)) {
      if (picked.length < 3) tryAdd(u);
    }

    // Fill remaining with new items or consumables
    for (const n of newItems.sort(() => Math.random() - 0.5)) {
      if (picked.length < 3) tryAdd(n);
    }

    // Ensure exactly 3 cards
    while (picked.length < 3 && candidates.length > 0) {
      const fallback = candidates[picked.length % candidates.length];
      picked.push(fallback);
    }

    return picked.slice(0, 3);
  }

  public applySelection(player: Player, card: DraftCard): boolean {
    switch (card.type) {
      case 'weapon_upgrade': {
        const weapon = player.weapons.find((w) => w.id === card.id);
        if (weapon && (weapon as any).upgrade) {
          (weapon as any).upgrade();
          return true;
        }
        break;
      }
      case 'weapon_new': {
        const weapon = this.loader.createWeapon(card.id, 1);
        return player.addWeapon(weapon);
      }
      case 'passive_upgrade':
      case 'passive_new': {
        const added = player.addPassive(card.id);
        if (added) {
          player.recalculateStats(this.passives);
        }
        return added;
      }
      case 'consumable': {
        if (card.id === 'hearty_meat') {
          player.heal(50);
        }
        return true;
      }
    }
    return false;
  }
}
