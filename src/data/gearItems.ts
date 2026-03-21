import { GearItem, GearSlotId } from '../types';

export const ALL_GEAR_ITEMS: GearItem[] = [
  {
    slotId: 'optics_rig',
    quality: 'standard',
    name: 'Dustwalker Lens',
    shortDesc: 'Better Finds',
    icon: 'binoculars',
  },
  {
    slotId: 'exo_vest',
    quality: 'standard',
    name: 'Drifter Vest',
    shortDesc: 'More Scans',
    icon: 'shield-half-full',
  },
  {
    slotId: 'grip_gauntlets',
    quality: 'standard',
    name: 'Steady Grips',
    shortDesc: 'Safer Risks',
    icon: 'hand-back-fist',
  },
  {
    slotId: 'nav_boots',
    quality: 'standard',
    name: 'Trailrunners',
    shortDesc: 'Faster Travel',
    icon: 'shoe-print',
  },
  {
    slotId: 'cortex_link',
    quality: 'standard',
    name: 'Neural Tap',
    shortDesc: 'Bigger Gambits',
    icon: 'brain',
  },
  {
    slotId: 'salvage_drone',
    quality: 'standard',
    name: 'Scrap Hawk',
    shortDesc: 'Backup Sweep',
    icon: 'drone',
  },
];

export const DEFAULT_ACTIVE_GEAR: GearSlotId[] = ['optics_rig', 'exo_vest', 'grip_gauntlets'];
