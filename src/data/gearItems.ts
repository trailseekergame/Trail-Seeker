import { GearItem, GearSlotId } from '../types';

/**
 * Complete gear catalog.
 *
 * Tiers: standard → enhanced → ultra
 * (perfected exists in balance config but is reserved for future crafting)
 *
 * Starter kit: 1x Drifter Vest (standard exo_vest)
 * Standard items: found via authored tile drops (8% / 6%)
 * Enhanced items: found in Relay Field or from rare+ scan outcomes
 * Ultra items: 0.5% drop from anomaly/boss tiles when streak >= 5
 */

// ═══════════════════════════════════════════════════════
// STANDARD TIER — found on Broken Overpass
// ═══════════════════════════════════════════════════════

export const GEAR_DUSTWALKER_LENS: GearItem = {
  slotId: 'optics_rig',
  quality: 'standard',
  name: 'Dustwalker Lens',
  shortDesc: 'Filters noise from scan signals. Rarer finds surface.',
  icon: 'binoculars',
  zone: 'sensor',
  lore: 'Salvaged from a relay tower south of the Dead Reactor. The glass is cracked but the filters still cut through tox-storm interference.',
};

export const GEAR_DRIFTER_VEST: GearItem = {
  slotId: 'exo_vest',
  quality: 'standard',
  name: 'Drifter Vest',
  shortDesc: 'Reinforced frame lets you run more scans per day.',
  icon: 'shield-half-full',
  zone: 'core',
  lore: 'Standard-issue for unlicensed operators. The power cell is duct-taped in, but it holds a charge long enough to run extra scans.',
};

export const GEAR_STEADY_GRIPS: GearItem = {
  slotId: 'grip_gauntlets',
  quality: 'standard',
  name: 'Steady Grips',
  shortDesc: 'Dampens interference. Fewer dead signals on risky scans.',
  icon: 'hand-back-fist',
  zone: 'core',
  lore: 'Dampener gloves pulled off a dead Directorate signal tech. They reduce hand tremor enough to hold a scan lock in high-interference zones.',
};

export const GEAR_TRAILRUNNERS: GearItem = {
  slotId: 'nav_boots',
  quality: 'standard',
  name: 'Trailrunners',
  shortDesc: 'Terrain-mapped soles. You cover more ground per scan.',
  icon: 'shoe-print',
  zone: 'drive',
  lore: 'Terrain-mapped boots from a Free Bands courier. The soles read ground composition and plot efficient routes through rubble fields.',
};

export const GEAR_NEURAL_TAP: GearItem = {
  slotId: 'cortex_link',
  quality: 'standard',
  name: 'Neural Tap',
  shortDesc: 'Wired into the rover\'s deep-field array. Gambits hit harder.',
  icon: 'brain',
  zone: 'sensor',
  lore: 'A crude neural interface wired into the rover\'s deep-field array. Hurts when it connects, but Gambit signals come through sharper.',
};

export const GEAR_SCRAP_HAWK: GearItem = {
  slotId: 'salvage_drone',
  quality: 'standard',
  name: 'Scrap Hawk',
  shortDesc: 'Automated recovery unit. Sometimes catches what you miss.',
  icon: 'drone',
  zone: 'drive',
  lore: 'Autonomous recovery drone cobbled together from Directorate surveillance parts. It circles back over missed signals and sometimes catches what you didn\'t.',
};

// Authored tile drops — mapped to real gear slots
export const GEAR_PADDED_JACKET: GearItem = {
  slotId: 'exo_vest',
  quality: 'standard',
  name: 'Padded Jacket',
  shortDesc: 'Layered padding absorbs impacts. +1 bonus scan.',
  icon: 'shield-half-full',
  zone: 'core',
  lore: 'Layered ballistic padding traded from a caravan near the Reclamation Zone border. Won\'t stop a bullet, but it absorbs enough impact to keep you scanning.',
};

export const GEAR_SCAVENGER_SATCHEL: GearItem = {
  slotId: 'nav_boots',
  quality: 'standard',
  name: 'Scavenger Satchel',
  shortDesc: 'Extra carry capacity. More ground covered per scan.',
  icon: 'shoe-print',
  zone: 'drive',
  lore: 'Oversized cargo harness used by ruin-pickers in the outer sectors. More carry capacity means more ground covered before the signal window closes.',
};

export const GEAR_SIGNAL_SCANNER: GearItem = {
  slotId: 'optics_rig',
  quality: 'standard',
  name: 'Signal Scanner',
  shortDesc: 'Broadband receiver. Slightly sharper scan reads.',
  icon: 'binoculars',
  zone: 'sensor',
  lore: 'Broadband receiver ripped from a downed Directorate drone. The housing is melted on one side but the antenna array still pulls clean signal.',
};

// ═══════════════════════════════════════════════════════
// ENHANCED TIER — found on Relay Field or rare+ outcomes
// ═══════════════════════════════════════════════════════

export const GEAR_DUSTWALKER_LENS_PLUS: GearItem = {
  slotId: 'optics_rig',
  quality: 'enhanced',
  name: 'Dustwalker Lens+',
  shortDesc: 'Tuned filters and a wider band. Rare signals come through cleaner.',
  icon: 'binoculars',
  zone: 'sensor',
  lore: 'Factory-tuned version found sealed in a pre-collapse shipping container. The filters are pristine — rare signals come through like they\'re shouting.',
};

export const GEAR_DRIFTER_VEST_PLUS: GearItem = {
  slotId: 'exo_vest',
  quality: 'enhanced',
  name: 'Drifter Vest+',
  shortDesc: 'Plated reinforcement. Extra scan charge and better loot quality.',
  icon: 'shield-half-full',
  zone: 'core',
  lore: 'Reinforced with plate salvaged from a Directorate APC. The extra weight is worth it — additional scan charge and cleaner loot resolution.',
};

export const GEAR_STEADY_GRIPS_PLUS: GearItem = {
  slotId: 'grip_gauntlets',
  quality: 'enhanced',
  name: 'Steady Grips+',
  shortDesc: 'Stabilized dampeners. Whiff rate drops noticeably.',
  icon: 'hand-back-fist',
  zone: 'core',
  lore: 'Military-grade stabilizers with active dampening. The Directorate used these for precision demolition. You use them to hold a scan lock in a tox-storm.',
};

export const GEAR_NEURAL_TAP_PLUS: GearItem = {
  slotId: 'cortex_link',
  quality: 'enhanced',
  name: 'Neural Tap+',
  shortDesc: 'Deep-field amplifier. Gambit legendary chance jumps.',
  icon: 'brain',
  zone: 'sensor',
  lore: 'Deep-field amplifier recovered from a Relay Tech outpost. The previous owner\'s initials are scratched into the housing. They didn\'t need it anymore.',
};

// ═══════════════════════════════════════════════════════
// ULTRA TIER — 0.5% from anomaly/boss tiles, streak >= 5
// ═══════════════════════════════════════════════════════

export const GEAR_GHOSTWEAVE_HOOD: GearItem = {
  slotId: 'optics_rig',
  quality: 'ultra',
  name: 'Ghostweave Hood',
  shortDesc: 'Pre-collapse optics woven into the fabric. Rare+ signals are almost guaranteed.',
  icon: 'binoculars',
  zone: 'sensor',
  lore: 'Pre-collapse military optics woven into adaptive fabric. The Directorate catalogued these as destroyed. This one survived in a sealed bunker beneath the Dead Reactor.',
};

export const GEAR_OVERCLOCKED_VEST: GearItem = {
  slotId: 'exo_vest',
  quality: 'ultra',
  name: 'Overclocked Vest Rig',
  shortDesc: 'Military-grade exoframe. +2 scans and loot quality boost.',
  icon: 'shield-half-full',
  zone: 'core',
  lore: 'Directorate special-operations exoframe. The power output was considered unsafe for standard troops. You\'re not standard troops.',
};

export const GEAR_GRIMLINE_BOOTS: GearItem = {
  slotId: 'nav_boots',
  quality: 'ultra',
  name: 'Grimline Boots',
  shortDesc: 'Directorate special-ops treads. Double sector progress chance.',
  icon: 'shoe-print',
  zone: 'drive',
  lore: 'Directorate spec-ops treads with terrain prediction AI. They read the ground three steps ahead. The previous wearer left them in a hurry.',
};

export const GEAR_ECHO_DRONE: GearItem = {
  slotId: 'salvage_drone',
  quality: 'ultra',
  name: 'Echo Drone Mk.III',
  shortDesc: 'Autonomous deep-recovery unit. 25% scan refund chance.',
  icon: 'drone',
  zone: 'drive',
  lore: 'Third-generation autonomous recovery unit. It operates on a frequency the Directorate can\'t jam. 25% of the time, it finds what you missed.',
};

// ═══════════════════════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════════════════════

/** All gear items in the game (for reference / dev tools) */
export const ALL_GEAR_ITEMS: GearItem[] = [
  // Standard
  GEAR_DUSTWALKER_LENS,
  GEAR_DRIFTER_VEST,
  GEAR_STEADY_GRIPS,
  GEAR_TRAILRUNNERS,
  GEAR_NEURAL_TAP,
  GEAR_SCRAP_HAWK,
  GEAR_PADDED_JACKET,
  GEAR_SCAVENGER_SATCHEL,
  GEAR_SIGNAL_SCANNER,
  // Enhanced
  GEAR_DUSTWALKER_LENS_PLUS,
  GEAR_DRIFTER_VEST_PLUS,
  GEAR_STEADY_GRIPS_PLUS,
  GEAR_NEURAL_TAP_PLUS,
  // Ultra
  GEAR_GHOSTWEAVE_HOOD,
  GEAR_OVERCLOCKED_VEST,
  GEAR_GRIMLINE_BOOTS,
  GEAR_ECHO_DRONE,
];

/** Items that can drop from Broken Overpass authored tiles */
export const OVERPASS_DROPS: GearItem[] = [
  GEAR_PADDED_JACKET,
  GEAR_SCAVENGER_SATCHEL,
  GEAR_SIGNAL_SCANNER,
  GEAR_DUSTWALKER_LENS,
  GEAR_STEADY_GRIPS,
  GEAR_SCRAP_HAWK,
];

/** Items that can drop from Relay Field (enhanced tier) */
export const RELAY_FIELD_DROPS: GearItem[] = [
  GEAR_DUSTWALKER_LENS_PLUS,
  GEAR_DRIFTER_VEST_PLUS,
  GEAR_STEADY_GRIPS_PLUS,
  GEAR_NEURAL_TAP_PLUS,
  GEAR_TRAILRUNNERS,
  GEAR_NEURAL_TAP,
];

/** Ultra-rare drops (anomaly/boss, streak >= 5) */
export const ULTRA_DROPS: GearItem[] = [
  GEAR_GHOSTWEAVE_HOOD,
  GEAR_OVERCLOCKED_VEST,
  GEAR_GRIMLINE_BOOTS,
  GEAR_ECHO_DRONE,
];

export const DEFAULT_ACTIVE_GEAR: GearSlotId[] = ['optics_rig', 'exo_vest', 'grip_gauntlets'];

/** Starter kit for a fresh profile: 1 basic vest, nothing else */
export const STARTER_GEAR: GearItem[] = [GEAR_DRIFTER_VEST];

/** Starter active slots: nothing equipped (player must choose) */
export const STARTER_ACTIVE_GEAR: GearSlotId[] = [];
