/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  OutfitConfig,
  OutfitArchetype,
  AnimationAction,
  StageEnvironmentType,
  CameraViewPreset,
  MaterialFinish,
  HeadgearStyle,
  TorsoStyle,
  ShoulderStyle,
  LegStyle,
  FootwearStyle,
  BackGearStyle,
} from '../types';
import { OUTFIT_PRESETS, COLOR_PALETTES, SKIN_TONES } from '../presets';
import { sounds } from '../audio/soundEffects';
import {
  Shirt,
  Palette,
  Activity,
  Sun,
  Camera,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gamepad2,
  Sliders,
  RotateCw,
} from 'lucide-react';

interface BottomDockProps {
  outfit: OutfitConfig;
  onUpdateOutfit: (newOutfit: OutfitConfig) => void;
  currentAction: AnimationAction;
  onSelectAction: (action: AnimationAction) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  isFreeRoam: boolean;
  onToggleFreeRoam: (enabled: boolean) => void;
  stagePreset: StageEnvironmentType;
  onSelectStage: (preset: StageEnvironmentType) => void;
  particlesVisible: boolean;
  onToggleParticles: (visible: boolean) => void;
  autoRotate: boolean;
  onToggleAutoRotate: (enabled: boolean) => void;
  cameraPreset: CameraViewPreset;
  onSelectCamera: (preset: CameraViewPreset) => void;
}

type TabType = 'outfits' | 'colors' | 'movement' | 'environment' | 'camera';

export const BottomDock: React.FC<BottomDockProps> = ({
  outfit,
  onUpdateOutfit,
  currentAction,
  onSelectAction,
  playbackSpeed,
  onSpeedChange,
  isFreeRoam,
  onToggleFreeRoam,
  stagePreset,
  onSelectStage,
  particlesVisible,
  onToggleParticles,
  autoRotate,
  onToggleAutoRotate,
  cameraPreset,
  onSelectCamera,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('outfits');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [modularSlot, setModularSlot] = useState<
    'headgear' | 'torso' | 'shoulders' | 'legs' | 'footwear' | 'backGear'
  >('headgear');

  const handleTabClick = (tab: TabType) => {
    sounds.playClick(750);
    setActiveTab(tab);
    if (isCollapsed) setIsCollapsed(false);
  };

  const handleArchetypeSelect = (arch: OutfitArchetype) => {
    sounds.playOutfitSwitch();
    onUpdateOutfit({ ...OUTFIT_PRESETS[arch] });
  };

  const handleSlotChange = (slot: string, value: string) => {
    sounds.playClick(650);
    onUpdateOutfit({
      ...outfit,
      [slot]: value,
    });
  };

  const handleFinishChange = (finish: MaterialFinish) => {
    sounds.playClick(680);
    onUpdateOutfit({
      ...outfit,
      finish,
    });
  };

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-out flex flex-col items-center ${
        isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
      style={{
        bottom: '20px',
        width: 'min(940px, 94vw)',
      }}
    >
      {/* Collapse / Expand Tab Handle */}
      <button
        onClick={() => {
          sounds.playClick(800);
          setIsCollapsed(!isCollapsed);
        }}
        className="px-4 py-1.5 mb-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 bg-zinc-900/90 text-zinc-300 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-colors shadow-lg cursor-pointer"
        title="Toggle HUD (or press 'H')"
      >
        {isCollapsed ? (
          <>
            <ChevronUp size={14} className="text-cyan-400" />
            <span>Show Studio Controls</span>
          </>
        ) : (
          <>
            <ChevronDown size={14} className="text-zinc-400" />
            <span>Hide Controls (Zen Mode)</span>
          </>
        )}
      </button>

      {/* Main Dock Container - Using solid/rgba backgrounds per WebGL guidelines */}
      <div className="w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2 bg-zinc-900/60 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleTabClick('outfits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'outfits'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Shirt size={14} />
              <span>Outfits &amp; Style</span>
            </button>

            <button
              onClick={() => handleTabClick('colors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'colors'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Palette size={14} />
              <span>Colors &amp; Materials</span>
            </button>

            <button
              onClick={() => handleTabClick('movement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'movement'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Activity size={14} />
              <span>Movement &amp; Actions</span>
            </button>

            <button
              onClick={() => handleTabClick('environment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'environment'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sun size={14} />
              <span>Stage &amp; Atmosphere</span>
            </button>

            <button
              onClick={() => handleTabClick('camera')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Camera size={14} />
              <span>Camera Views</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-mono bg-zinc-800/60 px-2 py-0.5 rounded text-zinc-300">
              {currentAction.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-3 sm:p-4 max-h-[220px] overflow-y-auto">
          {/* TAB 1: OUTFITS */}
          {activeTab === 'outfits' && (
            <div className="space-y-3.5">
              {/* Preset Archetypes */}
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-cyan-400" />
                  <span>Archetype Styles</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon Tech Jacket' },
                    { id: 'exoSuit', name: 'Exo Marauder', desc: 'Plated Armor' },
                    { id: 'tacticalRonin', name: 'Tactical Ronin', desc: 'Stealth Cowl & Vest' },
                    { id: 'celestialPaladin', name: 'Celestial Halo', desc: 'Gold & White Armor' },
                    { id: 'synthwaveBrawler', name: 'Synthwave', desc: 'Arcade Bodysuit' },
                  ].map((arch) => (
                    <button
                      key={arch.id}
                      onClick={() => handleArchetypeSelect(arch.id as OutfitArchetype)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        outfit.archetype === arch.id
                          ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="text-xs font-medium">{arch.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{arch.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Modular Parts Customizer */}
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2 flex items-center justify-between">
                  <span>Modular Equipment Customization</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Swap any slot</span>
                </div>

                {/* Slot Selector Pills */}
                <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'headgear', label: 'Headgear' },
                    { id: 'torso', label: 'Torso' },
                    { id: 'shoulders', label: 'Shoulders' },
                    { id: 'legs', label: 'Legs' },
                    { id: 'footwear', label: 'Footwear' },
                    { id: 'backGear', label: 'Back Gear' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => {
                        sounds.playClick(600);
                        setModularSlot(slot.id as any);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        modularSlot === slot.id
                          ? 'bg-zinc-700 text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>

                {/* Sub-options based on selected slot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {modularSlot === 'headgear' &&
                    [
                      { id: 'none', label: 'None (Cyber Hair)' },
                      { id: 'cyberVisor', label: 'Cyber Visor' },
                      { id: 'tacticalCowl', label: 'Tactical Cowl' },
                      { id: 'celestialHalo', label: 'Celestial Halo' },
                      { id: 'mechaHorns', label: 'Mecha Horns' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('headgear', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.headgear === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                  {modularSlot === 'torso' &&
                    [
                      { id: 'techJacket', label: 'Tech Jacket' },
                      { id: 'platedArmor', label: 'Plated Armor' },
                      { id: 'tacticalVest', label: 'Tactical Vest' },
                      { id: 'sleekBodysuit', label: 'Sleek Bodysuit' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('torso', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.torso === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                  {modularSlot === 'shoulders' &&
                    [
                      { id: 'none', label: 'None (Streamlined)' },
                      { id: 'sleekGuards', label: 'Sleek Guards' },
                      { id: 'heavyPauldrons', label: 'Heavy Pauldrons' },
                      { id: 'floatGuards', label: 'Levitating Shields' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('shoulders', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.shoulders === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                  {modularSlot === 'legs' &&
                    [
                      { id: 'cargoTech', label: 'Cargo Tech' },
                      { id: 'armoredGreaves', label: 'Armored Greaves' },
                      { id: 'combatShorts', label: 'Combat Shorts' },
                      { id: 'cyberLeggings', label: 'Cyber Leggings' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('legs', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.legs === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                  {modularSlot === 'footwear' &&
                    [
                      { id: 'hiTopRunners', label: 'Hi-Top Runners' },
                      { id: 'heavyExoBoots', label: 'Heavy Exo Boots' },
                      { id: 'magneticKicks', label: 'Magnetic Kicks' },
                      { id: 'stealthFlats', label: 'Stealth Flats' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('footwear', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.footwear === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                  {modularSlot === 'backGear' &&
                    [
                      { id: 'none', label: 'None (Clean)' },
                      { id: 'dualBlades', label: 'Dual Cyber Katanas' },
                      { id: 'jetpackThrusters', label: 'Jetpack Engines' },
                      { id: 'cyberCape', label: 'Hard-Light Cape' },
                      { id: 'orbitalRing', label: 'Celestial Ring' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSlotChange('backGear', item.id)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                          outfit.backGear === item.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLORS & MATERIALS */}
          {activeTab === 'colors' && (
            <div className="space-y-3.5">
              {/* PBR Material Finishes */}
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
                  Material Surface Finish
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'matte', name: 'Matte Polymer', desc: 'Clean diffuse' },
                    { id: 'metallic', name: 'Brushed Alloy', desc: 'Anisotropic 85%' },
                    { id: 'glossy', name: 'Gloss Ceramic', desc: 'Clearcoat 90%' },
                    { id: 'carbon', name: 'Carbon Fiber', desc: 'Tactile weave' },
                    { id: 'holographic', name: 'Holo Chrome', desc: 'Iridescent spec' },
                  ].map((fin) => (
                    <button
                      key={fin.id}
                      onClick={() => handleFinishChange(fin.id as MaterialFinish)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        outfit.finish === fin.id
                          ? 'bg-cyan-950/40 border-cyan-500 text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-medium">{fin.name}</div>
                      <div className="text-[10px] text-zinc-400">{fin.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatch Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Primary Color */}
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-300">Primary Armor</span>
                    <input
                      type="color"
                      value={outfit.primaryColor}
                      onChange={(e) => onUpdateOutfit({ ...outfit, primaryColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTES.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          sounds.playClick(500);
                          onUpdateOutfit({ ...outfit, primaryColor: c.hex });
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          outfit.primaryColor === c.hex
                            ? 'scale-115 border-white shadow-sm'
                            : 'border-zinc-700/60 hover:scale-105'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-300">Secondary Underlayer</span>
                    <input
                      type="color"
                      value={outfit.secondaryColor}
                      onChange={(e) => onUpdateOutfit({ ...outfit, secondaryColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTES.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          sounds.playClick(520);
                          onUpdateOutfit({ ...outfit, secondaryColor: c.hex });
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          outfit.secondaryColor === c.hex
                            ? 'scale-115 border-white shadow-sm'
                            : 'border-zinc-700/60 hover:scale-105'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Neon Emissive Glow */}
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-cyan-300 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Neon Emissive
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {outfit.glowIntensity}x
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COLOR_PALETTES.slice(0, 8).map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          sounds.playClick(580);
                          onUpdateOutfit({ ...outfit, glowColor: c.hex });
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          outfit.glowColor === c.hex
                            ? 'scale-115 border-white shadow-sm ring-1 ring-cyan-400'
                            : 'border-zinc-700/60 hover:scale-105'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                  {/* Glow intensity slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">Glow:</span>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.2"
                      value={outfit.glowIntensity}
                      onChange={(e) =>
                        onUpdateOutfit({ ...outfit, glowIntensity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 h-1 bg-zinc-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Skin Tone & Hair */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Skin Tone:</span>
                  <div className="flex gap-1">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone}
                        onClick={() => onUpdateOutfit({ ...outfit, skinTone: tone })}
                        style={{ backgroundColor: tone }}
                        className={`w-4 h-4 rounded-full border cursor-pointer ${
                          outfit.skinTone === tone ? 'scale-120 border-white' : 'border-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Hair Color:</span>
                  <div className="flex gap-1">
                    {['#0c0a09', '#1e1b4b', '#0284c7', '#ec4899', '#fde047', '#e2e8f0'].map((col) => (
                      <button
                        key={col}
                        onClick={() => onUpdateOutfit({ ...outfit, hairColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-4 h-4 rounded-full border cursor-pointer ${
                          outfit.hairColor === col ? 'scale-120 border-white' : 'border-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOVEMENT & ACTIONS */}
          {activeTab === 'movement' && (
            <div className="space-y-3.5">
              {/* Animation Action Pills */}
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2 flex items-center justify-between">
                  <span>Action Choreography</span>
                  <span className="text-[10px] text-zinc-400">Procedural Kinematics</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                  {[
                    { id: 'idle', label: 'Idle' },
                    { id: 'walk', label: 'Walk' },
                    { id: 'run', label: 'Run' },
                    { id: 'sprint', label: 'Sprint' },
                    { id: 'dance', label: 'Dance' },
                    { id: 'jump', label: 'Jump' },
                    { id: 'strike', label: 'Strike' },
                    { id: 'wave', label: 'Wave' },
                    { id: 'victory', label: 'Victory' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => {
                        sounds.playClick(620);
                        onSelectAction(act.id as AnimationAction);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        currentAction === act.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm font-semibold'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Movement Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                {/* Free Roam Controller Mode */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      sounds.playClick(700);
                      onToggleFreeRoam(!isFreeRoam);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                      isFreeRoam
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <Gamepad2 size={16} />
                    <span>{isFreeRoam ? 'Direct WASD Active' : 'Enable WASD Free-Roam'}</span>
                  </button>

                  <div className="text-[11px] text-zinc-400 hidden md:block">
                    {isFreeRoam ? (
                      <span className="text-emerald-400">
                        Use <strong className="text-white">W A S D</strong> to move,{' '}
                        <strong className="text-white">Shift</strong> to sprint,{' '}
                        <strong className="text-white">Space</strong> to jump!
                      </span>
                    ) : (
                      <span>Free-roam lets you steer the character freely across the arena floor</span>
                    )}
                  </div>
                </div>

                {/* Animation Speed Slider */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <span className="text-xs text-zinc-400 whitespace-nowrap flex items-center gap-1">
                    <Sliders size={13} />
                    Speed:
                  </span>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                    className="w-28 accent-cyan-400 h-1 bg-zinc-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-cyan-300 w-8">{playbackSpeed.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENVIRONMENT & STAGE */}
          {activeTab === 'environment' && (
            <div className="space-y-3.5">
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
                  Lighting &amp; Studio Atmosphere
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'neonCyber', name: 'Cyberpunk Neon', desc: 'Cyan & Magenta rim lights' },
                    { id: 'cleanStudio', name: 'Showroom Studio', desc: 'Warm 5500K key light' },
                    { id: 'deepNebula', name: 'Deep Space Nebula', desc: 'Cosmic violet void' },
                    { id: 'sunsetGold', name: 'Sunset Golden Hour', desc: 'Warm amber & rose fill' },
                  ].map((env) => (
                    <button
                      key={env.id}
                      onClick={() => {
                        sounds.playClick(650);
                        onSelectStage(env.id as StageEnvironmentType);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        stagePreset === env.id
                          ? 'bg-cyan-950/40 border-cyan-500 text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-medium">{env.name}</div>
                      <div className="text-[10px] text-zinc-400">{env.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    sounds.playClick(600);
                    onToggleAutoRotate(!autoRotate);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    autoRotate
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <RotateCw size={13} className={autoRotate ? 'animate-spin' : ''} />
                  <span>360° Turntable Auto-Rotate</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick(600);
                    onToggleParticles(!particlesVisible);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    particlesVisible
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Ambient Dust &amp; Energy Motes</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CAMERA VIEWS */}
          {activeTab === 'camera' && (
            <div className="space-y-3.5">
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
                  Camera Framing Presets (Damped Transitions)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'orbit', name: 'Full Body Orbit', desc: 'Free 360° rotation' },
                    { id: 'portrait', name: 'Face Portrait', desc: 'Close-up headgear inspect' },
                    { id: 'torso', name: 'Torso & Armor', desc: 'Chest plate & gauntlets' },
                    { id: 'footwear', name: 'Footwear & Boots', desc: 'Kicks & thrusters' },
                    { id: 'actionFollow', name: 'Action Follow Cam', desc: 'Tracks movement' },
                  ].map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => {
                        sounds.playClick(720);
                        onSelectCamera(cam.id as CameraViewPreset);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        cameraPreset === cam.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-medium">{cam.name}</div>
                      <div className="text-[10px] text-zinc-400">{cam.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center gap-2 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/60">
                <Camera size={14} className="text-cyan-400 shrink-0" />
                <span>
                  Tip: Left click &amp; drag to rotate, right click to pan, mouse wheel or pinch to zoom.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
