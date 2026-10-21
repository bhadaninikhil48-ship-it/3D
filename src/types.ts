/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OutfitArchetype = 
  | 'cyberpunk'
  | 'exoSuit'
  | 'tacticalRonin'
  | 'celestialPaladin'
  | 'synthwaveBrawler';

export type HeadgearStyle = 'none' | 'cyberVisor' | 'tacticalCowl' | 'celestialHalo' | 'mechaHorns';
export type TorsoStyle = 'techJacket' | 'platedArmor' | 'tacticalVest' | 'sleekBodysuit';
export type ShoulderStyle = 'none' | 'sleekGuards' | 'heavyPauldrons' | 'floatGuards';
export type LegStyle = 'cargoTech' | 'armoredGreaves' | 'combatShorts' | 'cyberLeggings';
export type FootwearStyle = 'hiTopRunners' | 'heavyExoBoots' | 'magneticKicks' | 'stealthFlats';
export type BackGearStyle = 'none' | 'dualBlades' | 'jetpackThrusters' | 'cyberCape' | 'orbitalRing';

export type MaterialFinish = 'matte' | 'metallic' | 'glossy' | 'carbon' | 'holographic';

export interface OutfitConfig {
  archetype: OutfitArchetype;
  headgear: HeadgearStyle;
  torso: TorsoStyle;
  shoulders: ShoulderStyle;
  legs: LegStyle;
  footwear: FootwearStyle;
  backGear: BackGearStyle;
  // Colors & Finishes
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  skinTone: string;
  hairColor: string;
  glowIntensity: number; // 0 to 3
  finish: MaterialFinish;
}

export type AnimationAction = 
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'dance'
  | 'jump'
  | 'strike'
  | 'wave'
  | 'victory';

export type StageEnvironmentType = 
  | 'neonCyber'
  | 'cleanStudio'
  | 'deepNebula'
  | 'sunsetGold';

export type CameraViewPreset = 
  | 'orbit'
  | 'portrait'
  | 'torso'
  | 'footwear'
  | 'actionFollow';

export interface MovementState {
  currentAction: AnimationAction;
  playbackSpeed: number; // 0.2 to 2.0
  isFreeRoam: boolean; // Direct WASD / Arrow control
  isMoving: boolean;
  isGrounded: boolean;
  velocity: { x: number; z: number };
  heading: number; // yaw angle in radians
}
