import { CosmeticItem } from '../types';

/**
 * Cosmetic Items – purely visual, no stat effects
 */
const cosmeticItems: CosmeticItem[] = [
  // ─── HEADGEAR ───
  {
    id: 'cos-basic-goggles',
    name: 'Drifter Goggles',
    slot: 'headgear',
    description: 'Standard-issue tinted goggles. Keeps the dust out, mostly.',
    icon: '🥽',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-reaver-mask',
    name: 'Reaver Half-Mask',
    slot: 'headgear',
    description: 'Scrap-metal face guard looted from a Reaver scout. Intimidating.',
    icon: '🎭',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Defeat Reaver Scouts 3 times',
  },
  {
    id: 'cos-directorate-visor',
    name: 'Directorate Visor',
    slot: 'headgear',
    description: 'A cracked riot visor from a Trail Taxman. Still functional.',
    icon: '😎',
    rarity: 'rare',
    unlocked: false,
    unlockCondition: 'Bluff past a Directorate checkpoint',
  },
  {
    id: 'cos-neon-crown',
    name: 'Neon Crown',
    slot: 'headgear',
    description: 'A circlet of salvaged LED strips. Glows cyan in the dark.',
    icon: '👑',
    rarity: 'legendary',
    unlocked: false,
    unlockCondition: 'Complete Zone 01',
  },

  // ─── COAT ───
  {
    id: 'cos-drifter-coat',
    name: 'Drifter Duster',
    slot: 'coat',
    description: 'Patched canvas coat. Stained but warm.',
    icon: '🧥',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-caravan-jacket',
    name: 'Iron Caravan Jacket',
    slot: 'coat',
    description: 'Reinforced leather with the Caravan crest. Respect on the road.',
    icon: '🦺',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Trade with Iron Caravan 3 times',
  },
  {
    id: 'cos-lantern-cloak',
    name: 'Lantern Cloak',
    slot: 'coat',
    description: 'A hooded cloak dyed in Lantern orange. Marks you as a friend.',
    icon: '🧣',
    rarity: 'rare',
    unlocked: false,
    unlockCondition: 'Help the Lanterns 3 times',
  },

  // ─── BACK ITEM ───
  {
    id: 'cos-standard-pack',
    name: 'Standard Rig',
    slot: 'backItem',
    description: 'A basic frame pack with modular pouches.',
    icon: '🎒',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-scrap-frame',
    name: 'Scrap-Welder Frame',
    slot: 'backItem',
    description: 'Welded from factory scraps. Heavy but impressive.',
    icon: '⚙️',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Collect 50 total scrap',
  },

  // ─── PATCH ───
  {
    id: 'cos-trail-patch',
    name: 'Trail Marker Patch',
    slot: 'patch',
    description: 'A simple cloth patch with the universal Trail symbol.',
    icon: '🏷️',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-zone01-patch',
    name: 'Rustbelt Verge Patch',
    slot: 'patch',
    description: 'Earned by completing Zone 01. A gear inside a broken circle.',
    icon: '🔰',
    rarity: 'rare',
    unlocked: false,
    unlockCondition: 'Complete Zone 01',
  },

  // ─── ROVER DECAL ───
  {
    id: 'cos-basic-decal',
    name: 'Factory Standard',
    slot: 'roverDecal',
    description: 'No decal. The rover\'s original dull gray paint.',
    icon: '🔲',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-neon-stripe',
    name: 'Neon Stripe',
    slot: 'roverDecal',
    description: 'Glowing green racing stripe. Visible from half a mile.',
    icon: '💚',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Reach the Sunken Overpass',
  },
  {
    id: 'cos-skull-decal',
    name: 'Reaver Kill Marks',
    slot: 'roverDecal',
    description: 'Tally marks scratched into the hull. Each one tells a story.',
    icon: '💀',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Defeat 5 enemies',
  },

  // ─── ACCESSORY ───
  {
    id: 'cos-bandana',
    name: 'Dust Bandana',
    slot: 'accessory',
    description: 'Faded red cloth. Keeps the worst of the acid haze out.',
    icon: '🔴',
    rarity: 'common',
    unlocked: true,
  },
  {
    id: 'cos-lucky-charm',
    name: 'Lucky Dice',
    slot: 'accessory',
    description: 'A pair of loaded dice on a cord. Whether they\'re actually lucky is debatable.',
    icon: '🎲',
    rarity: 'uncommon',
    unlocked: false,
    unlockCondition: 'Survive 5 hazard events',
  },
  {
    id: 'cos-glassborn-shard',
    name: 'Glassborn Shard',
    slot: 'accessory',
    description: 'A sliver of fused glass from a Glassborn encounter. It hums faintly.',
    icon: '✨',
    rarity: 'legendary',
    unlocked: false,
    unlockCondition: 'Encounter the Glassborn',
  },
];

export default cosmeticItems;
