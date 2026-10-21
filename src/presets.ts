/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OutfitConfig, OutfitArchetype } from './types';

export const DEFAULT_OUTFIT: OutfitConfig = {
  archetype: 'cyberpunk',
  headgear: 'cyberVisor',
  torso: 'techJacket',
  shoulders: 'sleekGuards',
  legs: 'cargoTech',
  footwear: 'hiTopRunners',
  backGear: 'dualBlades',
  primaryColor: '#06b6d4', // Cyan
  secondaryColor: '#18181b', // Zinc
  accentColor: '#f43f5e', // Neon Rose
  glowColor: '#00f0ff', // Vivid Cyan Glow
  skinTone: '#e0a98b',
  hairColor: '#1e1b4b',
  glowIntensity: 1.8,
  finish: 'carbon',
};

export const OUTFIT_PRESETS: Record<OutfitArchetype, OutfitConfig> = {
  cyberpunk: {
    archetype: 'cyberpunk',
    headgear: 'cyberVisor',
    torso: 'techJacket',
    shoulders: 'sleekGuards',
    legs: 'cargoTech',
    footwear: 'hiTopRunners',
    backGear: 'dualBlades',
    primaryColor: '#06b6d4',
    secondaryColor: '#18181b',
    accentColor: '#f43f5e',
    glowColor: '#00f0ff',
    skinTone: '#e0a98b',
    hairColor: '#0284c7',
    glowIntensity: 2.0,
    finish: 'carbon',
  },
  exoSuit: {
    archetype: 'exoSuit',
    headgear: 'mechaHorns',
    torso: 'platedArmor',
    shoulders: 'heavyPauldrons',
    legs: 'armoredGreaves',
    footwear: 'heavyExoBoots',
    backGear: 'jetpackThrusters',
    primaryColor: '#334155',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    glowColor: '#38bdf8',
    skinTone: '#d49774',
    hairColor: '#475569',
    glowIntensity: 2.5,
    finish: 'metallic',
  },
  tacticalRonin: {
    archetype: 'tacticalRonin',
    headgear: 'tacticalCowl',
    torso: 'tacticalVest',
    shoulders: 'none',
    legs: 'cargoTech',
    footwear: 'stealthFlats',
    backGear: 'dualBlades',
    primaryColor: '#1c1917',
    secondaryColor: '#292524',
    accentColor: '#dc2626',
    glowColor: '#ef4444',
    skinTone: '#e2a788',
    hairColor: '#0c0a09',
    glowIntensity: 1.2,
    finish: 'matte',
  },
  celestialPaladin: {
    archetype: 'celestialPaladin',
    headgear: 'celestialHalo',
    torso: 'platedArmor',
    shoulders: 'floatGuards',
    legs: 'armoredGreaves',
    footwear: 'magneticKicks',
    backGear: 'orbitalRing',
    primaryColor: '#f8fafc',
    secondaryColor: '#e2e8f0',
    accentColor: '#f59e0b',
    glowColor: '#fbbf24',
    skinTone: '#f3c4a2',
    hairColor: '#fde047',
    glowIntensity: 2.4,
    finish: 'holographic',
  },
  synthwaveBrawler: {
    archetype: 'synthwaveBrawler',
    headgear: 'none',
    torso: 'sleekBodysuit',
    shoulders: 'sleekGuards',
    legs: 'combatShorts',
    footwear: 'hiTopRunners',
    backGear: 'cyberCape',
    primaryColor: '#9333ea',
    secondaryColor: '#f43f5e',
    accentColor: '#fbbf24',
    glowColor: '#e879f9',
    skinTone: '#d99066',
    hairColor: '#ec4899',
    glowIntensity: 2.2,
    finish: 'glossy',
  },
};

export const COLOR_PALETTES = [
  { name: 'Neon Cyan', hex: '#06b6d4' },
  { name: 'Laser Magenta', hex: '#ec4899' },
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Acid Lime', hex: '#84cc16' },
  { name: 'Obsidian Black', hex: '#18181b' },
  { name: 'Pure White', hex: '#f8fafc' },
  { name: 'Royal Violet', hex: '#8b5cf6' },
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Titanium Blue', hex: '#3b82f6' },
  { name: 'Emerald Jade', hex: '#10b981' },
];

export const SKIN_TONES = [
  '#fbe4d8',
  '#f3c4a2',
  '#e0a98b',
  '#d49774',
  '#b7734f',
  '#8c4a2a',
  '#592b18',
  '#a5b4fc', // Cyber android tone
];

export function getRandomOutfit(): OutfitConfig {
  const headgears = ['none', 'cyberVisor', 'tacticalCowl', 'celestialHalo', 'mechaHorns'] as const;
  const torsos = ['techJacket', 'platedArmor', 'tacticalVest', 'sleekBodysuit'] as const;
  const shoulders = ['none', 'sleekGuards', 'heavyPauldrons', 'floatGuards'] as const;
  const legs = ['cargoTech', 'armoredGreaves', 'combatShorts', 'cyberLeggings'] as const;
  const footwears = ['hiTopRunners', 'heavyExoBoots', 'magneticKicks', 'stealthFlats'] as const;
  const backGears = ['none', 'dualBlades', 'jetpackThrusters', 'cyberCape', 'orbitalRing'] as const;
  const finishes = ['matte', 'metallic', 'glossy', 'carbon', 'holographic'] as const;

  const randColor = () => COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)].hex;
  const randSkin = () => SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];

  return {
    archetype: 'cyberpunk',
    headgear: headgears[Math.floor(Math.random() * headgears.length)],
    torso: torsos[Math.floor(Math.random() * torsos.length)],
    shoulders: shoulders[Math.floor(Math.random() * shoulders.length)],
    legs: legs[Math.floor(Math.random() * legs.length)],
    footwear: footwears[Math.floor(Math.random() * footwears.length)],
    backGear: backGears[Math.floor(Math.random() * backGears.length)],
    primaryColor: randColor(),
    secondaryColor: randColor(),
    accentColor: randColor(),
    glowColor: randColor(),
    skinTone: randSkin(),
    hairColor: randColor(),
    glowIntensity: +(1.2 + Math.random() * 1.5).toFixed(1),
    finish: finishes[Math.floor(Math.random() * finishes.length)],
  };
}
