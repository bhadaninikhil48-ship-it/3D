/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dice5, RotateCcw, Camera, Volume2, VolumeX, HelpCircle, Gamepad2 } from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface TopBarProps {
  currentAction: string;
  isFreeRoam: boolean;
  onRandomize: () => void;
  onReset: () => void;
  onSnapshot: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentAction,
  isFreeRoam,
  onRandomize,
  onReset,
  onSnapshot,
  isMuted,
  onToggleMute,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 p-3 sm:p-4 flex items-center justify-between pointer-events-none">
        {/* Left: Branding & Status Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
                <span>NOVA 3D</span>
                <span className="text-cyan-400 font-mono text-[10px]">v1.0</span>
              </div>
              <div className="text-[10px] text-zinc-400">Character &amp; Outfit Studio</div>
            </div>
          </div>

          {/* Clean Static Status Indicator (No pulsating dots) */}
          <div className="hidden md:flex items-center gap-2 bg-zinc-950/90 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs shadow-xl text-zinc-300">
            {isFreeRoam ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Gamepad2 size={14} />
                <span>WASD Free-Roam Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span>Action:</span>
                <strong className="text-cyan-300 capitalize font-medium">{currentAction}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Surprise Me / Randomize */}
          <button
            onClick={() => {
              sounds.playOutfitSwitch();
              onRandomize();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 shadow-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Randomize Outfit &amp; Style"
          >
            <Dice5 size={15} className="text-cyan-400" />
            <span className="hidden sm:inline">Randomize</span>
          </button>

          {/* Take Snapshot Photo */}
          <button
            onClick={() => {
              sounds.playShutter();
              onSnapshot();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 shadow-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export High-Res PNG Photo"
          >
            <Camera size={15} className="text-amber-400" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              sounds.playClick(500);
              onReset();
            }}
            className="p-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 shadow-xl transition-colors cursor-pointer"
            title="Reset to Default"
          >
            <RotateCcw size={15} />
          </button>

          {/* Mute Audio */}
          <button
            onClick={() => {
              onToggleMute();
            }}
            className="p-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 shadow-xl transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-cyan-400" />}
          </button>

          {/* Help Modal */}
          <button
            onClick={() => {
              sounds.playClick(600);
              setShowHelp(true);
            }}
            className="p-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 shadow-xl transition-colors cursor-pointer"
            title="Help &amp; Shortcuts"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                <Gamepad2 size={16} className="text-cyan-400" />
                <span>Controls &amp; Shortcuts</span>
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                <div className="font-semibold text-white mb-1.5">Direct Character Movement</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div>
                    <strong className="text-cyan-300">W, A, S, D</strong> : Walk / Steer
                  </div>
                  <div>
                    <strong className="text-cyan-300">Shift</strong> : Sprint Turbo
                  </div>
                  <div>
                    <strong className="text-cyan-300">Spacebar</strong> : Jump
                  </div>
                  <div>
                    <strong className="text-cyan-300">H</strong> : Toggle Zen HUD
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                <div className="font-semibold text-white mb-1.5">Camera Orbit &amp; Zoom</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div>Left Click + Drag: Orbit 360°</div>
                  <div>Right Click + Drag: Pan Camera</div>
                  <div>Mouse Wheel: Smooth Zoom</div>
                  <div>Touch Pinch: Mobile Zoom</div>
                </div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                <div className="font-semibold text-white mb-1.5">Features</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Customize modular headgear, chest armor, pauldrons, greaves, boots, and back gear.
                  Pick PBR material finishes (Matte, Brushed Metal, Carbon Fiber, Gloss Ceramic, Holo),
                  switch stage environments, and take high-resolution snapshots.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Got it, let's play!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
