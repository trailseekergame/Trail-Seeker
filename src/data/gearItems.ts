import { GearItem, GearSlotId } from '../types';

export const ALL_GEAR_ITEMS: GearItem[] = [
  {
    slotId: 'optics_rig',
    quality: 'standard',
    name: 'Dustwalker Lens',
    shortDesc: 'Filters noise from scan signals. Rarer finds surface.',
    icon: 'binoculars',
  },
  {
    slotId: 'exo_vest',
    quality: 'standard',
    name: 'Drifter Vest',
    shortDesc: 'Reinforced frame lets you run more scans per day.',
    icon: 'shield-half-full',
  },
  {
    slotId: 'grip_gauntlets',
    quality: 'standard',
    name: 'Steady Grips',
    shortDesc: 'Dampens interference. Fewer dead signals on risky scans.',
    icon: 'hand-back-fist',
  },
  {
    slotId: 'nav_boots',
    quality: 'standard',
    name: 'Trailrunners',
    shortDesc: 'Terrain-mapped soles. You cover more ground per scan.',
    icon: 'shoe-print',
  },
  {
    slotId: 'cortex_link',
    quality: 'standard',
    name: 'Neural Tap',
    shortDesc: 'Wired into the rover\'s deep-field array. Gambits hit harder.',
    icon: 'brain',
  },
  {
    slotId: 'salvage_drone',
    quality: 'standard',
    name: 'Scrap Hawk',
    shortDesc: 'Automated recovery unit. Sometimes catches what you miss.',
    icon: 'drone',
  },
];

export const DEFAULT_ACTIVE_GEAR: GearSlotId[] = ['optics_rig', 'exo_vest', 'grip_gauntlets'];

/** Starter kit for a fresh profile: 1 basic vest, nothing else */
export const STARTER_GEAR: GearItem[] = [
  {
    slotId: 'exo_vest',
    quality: 'standard',
    name: 'Drifter Vest',
    shortDesc: 'Reinforced frame lets you run more scans per day.',
    icon: 'shield-half-full',
  },
];

/** Starter active slots: nothing equipped (player must choose) */
export const STARTER_ACTIVE_GEAR: GearSlotId[] = [];
