/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, Zap } from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface MobileJoystickProps {
  onVectorChange: (vx: number, vz: number, isSprinting: boolean) => void;
  onJump: () => void;
  active: boolean;
}

export const MobileJoystick: React.FC<MobileJoystickProps> = ({
  onVectorChange,
  onJump,
  active,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  const radius = 45; // Max radius in pixels

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateKnob(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    updateKnob(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onVectorChange(0, 0, false);
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    // Normalize -1 to 1
    const normX = kx / radius;
    const normZ = ky / radius;

    onVectorChange(normX, normZ, isSprinting);
  };

  if (!active) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-20 pointer-events-none flex items-end justify-between sm:hidden">
      {/* Virtual D-pad Knob */}
      <div
        ref={baseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-28 h-28 rounded-full bg-zinc-950/80 border-2 border-zinc-700 pointer-events-auto flex items-center justify-center relative touch-none shadow-2xl"
      >
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className="w-12 h-12 rounded-full bg-cyan-500/80 border-2 border-cyan-300 shadow-lg pointer-events-none transition-transform duration-75"
        />
      </div>

      {/* Action Buttons (Sprint & Jump) */}
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        {/* Sprint Toggle */}
        <button
          onClick={() => {
            sounds.playClick(600);
            setIsSprinting(!isSprinting);
            onVectorChange(knobPos.x / radius, knobPos.y / radius, !isSprinting);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-xl transition-all cursor-pointer ${
            isSprinting
              ? 'bg-amber-500 text-zinc-950 border-amber-300 scale-105'
              : 'bg-zinc-950/80 text-zinc-300 border-zinc-700'
          }`}
          title="Sprint Turbo"
        >
          <Zap size={20} />
        </button>

        {/* Jump Button */}
        <button
          onClick={() => {
            onJump();
          }}
          className="w-14 h-14 rounded-full bg-cyan-500 text-zinc-950 border-2 border-cyan-300 flex items-center justify-center font-bold shadow-xl active:scale-95 transition-transform cursor-pointer"
          title="Jump"
        >
          <ArrowUp size={24} />
        </button>
      </div>
    </div>
  );
};
