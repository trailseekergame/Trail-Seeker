import { GearItem, GearSlotId } from '../types';
import gameBalance from '../config/gameBalance.json';

export type CombatAction = 'attack' | 'defend' | 'scan';

export interface Enemy {
  name: string;
  maxHp: number;
  hp: number;
  minDamage: number;
  maxDamage: number;
  scrapReward: number;
  supplyReward: number;
  type: 'anomaly' | 'boss';
  icon: string;
}

export interface CombatTurnResult {
  playerAction: CombatAction;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  enemyAction: 'attack' | 'heavy' | 'charge';
  enemyHpAfter: number;
  playerDefending: boolean;
}

export function createEnemy(tileType: 'anomaly' | 'boss', hardMode: boolean = false): Enemy {
  const scale = hardMode ? 1.5 : 1;
  if (tileType === 'boss') {
    return {
      name: hardMode ? 'Directorate Warden' : 'Directorate Sentinel',
      maxHp: Math.round(50 * scale),
      hp: Math.round(50 * scale),
      minDamage: Math.round(8 * scale),
      maxDamage: Math.round(14 * scale),
      scrapReward: Math.round(12 * scale),
      supplyReward: Math.round(3 * scale),
      type: 'boss',
      icon: 'robot-angry',
    };
  }
  return {
    name: hardMode ? 'Armored Drone' : 'Rogue Drone',
    maxHp: Math.round(25 * scale),
    hp: Math.round(25 * scale),
    minDamage: Math.round(5 * scale),
    maxDamage: Math.round(8 * scale),
    scrapReward: Math.round(5 * scale),
    supplyReward: hardMode ? 1 : 0,
    type: 'anomaly',
    icon: 'drone',
  };
}

export function getWeaponDamage(gearInventory: GearItem[], activeSlots: GearSlotId[]): number {
  const baseDamage = 8;
  if (!activeSlots.includes('sidearm')) return baseDamage;
  const weapon = gearInventory.find(g => g.slotId === 'sidearm');
  if (!weapon) return baseDamage;
  const stats = (gameBalance.gear_stats.sidearm as any)?.[weapon.quality];
  const bonus = stats?.damage_bonus || 0;
  return Math.round(baseDamage * (1 + bonus));
}

export function getWeaponScrapBonus(gearInventory: GearItem[], activeSlots: GearSlotId[]): number {
  if (!activeSlots.includes('sidearm')) return 0;
  const weapon = gearInventory.find(g => g.slotId === 'sidearm');
  if (!weapon) return 0;
  const stats = (gameBalance.gear_stats.sidearm as any)?.[weapon.quality];
  return stats?.scrap_bonus || 0;
}

// ─── Telegraph system: enemy shows intent, player reads and counters ───
export type EnemyIntent = 'targeting' | 'exposed' | 'scanning';
export const FEINT_RATE = 0.20; // 20% chance telegraph is a lie

export function rollEnemyIntent(): { shown: EnemyIntent; real: EnemyIntent } {
  const intents: EnemyIntent[] = ['targeting', 'exposed', 'scanning'];
  const real = intents[Math.floor(Math.random() * intents.length)];
  const feint = Math.random() < FEINT_RATE;
  const shown = feint ? intents[Math.floor(Math.random() * intents.length)] : real;
  return { shown, real };
}

export function resolveTurn(
  playerAction: CombatAction,
  enemy: Enemy,
  weaponDamage: number,
  realIntent: EnemyIntent,
): CombatTurnResult {
  // Player damage
  let playerDamageDealt = 0;
  if (playerAction === 'attack') {
    const variance = 0.8 + Math.random() * 0.4;
    playerDamageDealt = Math.max(1, Math.round(weaponDamage * variance));
    // Bonus damage if enemy is exposed
    if (realIntent === 'exposed') {
      playerDamageDealt = Math.round(playerDamageDealt * 1.5);
    }
  }

  // Enemy damage based on real intent
  const base = enemy.minDamage + Math.floor(Math.random() * (enemy.maxDamage - enemy.minDamage + 1));
  let enemyDamageDealt: number;
  let enemyAction: 'attack' | 'heavy' | 'charge';

  if (realIntent === 'targeting') {
    enemyDamageDealt = Math.round(base * 1.2); // focused attack
    enemyAction = 'heavy';
  } else if (realIntent === 'exposed') {
    enemyDamageDealt = Math.round(base * 0.5); // weak attack
    enemyAction = 'attack';
  } else {
    // scanning
    enemyDamageDealt = Math.round(base * 0.8);
    enemyAction = 'attack';
  }

  // Player counters
  const playerDefending = playerAction === 'defend';
  if (playerDefending && enemyDamageDealt > 0) {
    enemyDamageDealt = Math.max(1, Math.round(enemyDamageDealt * 0.5));
  }

  // Scan counter: if player scans when enemy scans, enemy misses
  if (playerAction === 'scan' && realIntent === 'scanning') {
    enemyDamageDealt = 0;
    enemyAction = 'charge'; // reuse 'charge' to indicate miss in the log
  }

  return {
    playerAction,
    playerDamageDealt,
    enemyDamageDealt,
    enemyAction,
    enemyHpAfter: Math.max(0, enemy.hp - playerDamageDealt),
    playerDefending,
  };
}
