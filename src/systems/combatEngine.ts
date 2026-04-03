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

export function createEnemy(tileType: 'anomaly' | 'boss'): Enemy {
  if (tileType === 'boss') {
    return {
      name: 'Directorate Sentinel',
      maxHp: 50,
      hp: 50,
      minDamage: 8,
      maxDamage: 14,
      scrapReward: 12,
      supplyReward: 3,
      type: 'boss',
      icon: 'robot-angry',
    };
  }
  return {
    name: 'Rogue Drone',
    maxHp: 25,
    hp: 25,
    minDamage: 5,
    maxDamage: 8,
    scrapReward: 5,
    supplyReward: 0,
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

export function rollEnemyAction(isCharging: boolean): 'attack' | 'heavy' | 'charge' {
  if (isCharging) return 'heavy'; // charged attack always fires as heavy on next turn
  const roll = Math.random();
  if (roll < 0.10) return 'charge';
  if (roll < 0.30) return 'heavy';
  return 'attack';
}

export function computeEnemyDamage(enemy: Enemy, action: 'attack' | 'heavy' | 'charge'): number {
  if (action === 'charge') return 0; // charging, no damage this turn
  const base = enemy.minDamage + Math.floor(Math.random() * (enemy.maxDamage - enemy.minDamage + 1));
  if (action === 'heavy') return Math.round(base * 1.5);
  return base;
}

export function resolveTurn(
  playerAction: CombatAction,
  enemy: Enemy,
  weaponDamage: number,
  isEnemyCharging: boolean,
): CombatTurnResult {
  // Player damage
  let playerDamageDealt = 0;
  if (playerAction === 'attack') {
    // Small random variance: weaponDamage ± 20%
    const variance = 0.8 + Math.random() * 0.4;
    playerDamageDealt = Math.max(1, Math.round(weaponDamage * variance));
  }

  // Enemy action
  const enemyAction = rollEnemyAction(isEnemyCharging);
  let enemyDamageDealt = computeEnemyDamage(enemy, enemyAction);

  // Defense halves incoming
  const playerDefending = playerAction === 'defend';
  if (playerDefending && enemyDamageDealt > 0) {
    enemyDamageDealt = Math.max(1, Math.round(enemyDamageDealt * 0.5));
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
