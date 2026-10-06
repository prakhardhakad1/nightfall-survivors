import { describe, it, expect } from 'vitest';
import weaponsData from '../data/weapons.json';
import { WeaponLoader } from '../src/combat/weapons/weaponLoader';
import { Player } from '../src/entities/player';

describe('Module A: Weapon Arsenal & Scaling Logic', () => {
  const loader = new WeaponLoader();

  it('contains exactly 12 launch weapons with evolution targets and 12 evolved weapons', () => {
    const launchWeapons = loader.getLaunchWeaponDefs();
    expect(launchWeapons.length).toBe(12);

    const allWeapons = loader.getAllDefs();
    expect(allWeapons.length).toBe(24);
  });

  it('ensures every weapon has exactly 8 levels with positive damage, cooldown, and area', () => {
    for (const w of weaponsData) {
      expect(w.levels.length).toBe(8);
      for (let i = 0; i < 8; i++) {
        const lvl = w.levels[i];
        expect(lvl.level).toBe(i + 1);
        expect(lvl.damage).toBeGreaterThan(0);
        expect(lvl.cooldown).toBeGreaterThan(0);
        expect(lvl.area).toBeGreaterThan(0);
      }
    }
  });

  it('ensures weapon damage scales up with level progression', () => {
    for (const w of weaponsData) {
      const lv1 = w.levels[0];
      const lv8 = w.levels[7];
      expect(lv8.damage).toBeGreaterThan(lv1.damage);
    }
  });

  it('instantiates all 12 launch weapons properly', () => {
    const expected = [
      'spark_dagger', 'ember_orbit', 'frost_nova', 'chain_lightning',
      'boomerang_blade', 'venom_cloud', 'prism_beam', 'meteor_call',
      'thorn_guard', 'gale_blades', 'moon_aura', 'howl_pack'
    ];

    expected.forEach((id) => {
      const weapon = loader.createWeapon(id);
      expect(weapon.id).toBe(id);
      expect(weapon.level).toBe(1);
    });
  });

  it('correctly gates weapon evolution behind Level 8 + required passive', () => {
    const dagger = loader.createWeapon('spark_dagger', 7);
    const passives = new Map<string, number>();

    // Case 1: Level 7, no passive
    expect(loader.canEvolve(dagger, passives)).toBeNull();

    // Case 2: Level 8, no passive
    dagger.level = 8;
    expect(loader.canEvolve(dagger, passives)).toBeNull();

    // Case 3: Level 8, wrong passive
    passives.set('swift_boots', 1);
    expect(loader.canEvolve(dagger, passives)).toBeNull();

    // Case 4: Level 8, matching passive (might)
    passives.set('might', 1);
    expect(loader.canEvolve(dagger, passives)).toBe('storm_dagger');

    // Case 5: Evolve transform
    const evolved = loader.evolveWeapon(dagger, passives);
    expect(evolved).not.toBeNull();
    expect(evolved?.id).toBe('storm_dagger');
    expect(evolved?.level).toBe(1);
  });

  it('enforces player weapon inventory cap of 6 weapons', () => {
    const player = new Player();
    for (let i = 0; i < 6; i++) {
      const w = loader.createWeapon('spark_dagger');
      expect(player.addWeapon(w)).toBe(true);
    }
    // 7th weapon should fail
    const excess = loader.createWeapon('ember_orbit');
    expect(player.addWeapon(excess)).toBe(false);
    expect(player.weapons.length).toBe(6);
  });
});
