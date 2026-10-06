import weaponsData from '../../../data/weapons.json';
import { IWeapon, IWeaponDef } from '../../types/interfaces';
import {
  SparkDaggerWeapon,
  EmberOrbitWeapon,
  FrostNovaWeapon,
  ChainLightningWeapon,
  BoomerangBladeWeapon,
  VenomCloudWeapon,
  PrismBeamWeapon,
  MeteorCallWeapon,
  ThornGuardWeapon,
  GaleBladesWeapon,
  MoonAuraWeapon,
  HowlPackWeapon
} from './weaponRegistry';

export class WeaponLoader {
  private static instance: WeaponLoader;
  private defs: Map<string, IWeaponDef> = new Map();

  constructor() {
    (weaponsData as any[]).forEach((w) => {
      this.defs.set(w.id, w as IWeaponDef);
    });
  }

  public static get(): WeaponLoader {
    if (!WeaponLoader.instance) {
      WeaponLoader.instance = new WeaponLoader();
    }
    return WeaponLoader.instance;
  }

  public getDef(id: string): IWeaponDef | undefined {
    return this.defs.get(id);
  }

  public getAllDefs(): IWeaponDef[] {
    return Array.from(this.defs.values());
  }

  public getLaunchWeaponDefs(): IWeaponDef[] {
    // Only base weapons (those with evolution field not null)
    return Array.from(this.defs.values()).filter((d) => d.evolution !== null);
  }

  public createWeapon(id: string, level: number = 1): IWeapon {
    const def = this.getDef(id);
    if (!def) {
      throw new Error(`Weapon definition not found for ID: ${id}`);
    }

    const isEvolved = def.evolution === null;

    switch (id) {
      case 'spark_dagger':
      case 'storm_dagger':
        return new SparkDaggerWeapon(def, level, isEvolved);
      case 'ember_orbit':
      case 'solar_corona':
        return new EmberOrbitWeapon(def, level, isEvolved);
      case 'frost_nova':
      case 'absolute_zero':
        return new FrostNovaWeapon(def, level, isEvolved);
      case 'chain_lightning':
      case 'thunderstorm':
        return new ChainLightningWeapon(def, level, isEvolved);
      case 'boomerang_blade':
      case 'scythe_of_vengeance':
        return new BoomerangBladeWeapon(def, level, isEvolved);
      case 'venom_cloud':
      case 'toxic_miasma':
        return new VenomCloudWeapon(def, level, isEvolved);
      case 'prism_beam':
      case 'death_ray':
        return new PrismBeamWeapon(def, level, isEvolved);
      case 'meteor_call':
      case 'starfall':
        return new MeteorCallWeapon(def, level, isEvolved);
      case 'thorn_guard':
      case 'bramble_bastion':
        return new ThornGuardWeapon(def, level, isEvolved);
      case 'gale_blades':
      case 'cyclone_blades':
        return new GaleBladesWeapon(def, level, isEvolved);
      case 'moon_aura':
      case 'eclipse_nova':
        return new MoonAuraWeapon(def, level, isEvolved);
      case 'howl_pack':
      case 'apex_pack':
        return new HowlPackWeapon(def, level, isEvolved);
      default:
        return new SparkDaggerWeapon(def, level, isEvolved);
    }
  }

  public canEvolve(weapon: IWeapon, playerPassives: Map<string, number>): string | null {
    if (weapon.level < 8) return null;
    const def = this.getDef(weapon.id);
    if (!def || !def.evolution) return null;

    const requiredPassive = def.evolution.requiresPassive;
    const passiveLevel = playerPassives.get(requiredPassive) || 0;
    if (passiveLevel > 0) {
      return def.evolution.evolvesTo;
    }
    return null;
  }

  public evolveWeapon(weapon: IWeapon, playerPassives: Map<string, number>): IWeapon | null {
    const targetEvolvedId = this.canEvolve(weapon, playerPassives);
    if (!targetEvolvedId) return null;
    return this.createWeapon(targetEvolvedId, 1);
  }
}
