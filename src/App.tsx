/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './scene/SceneManager';
import { BottomDock } from './components/BottomDock';
import { TopBar } from './components/TopBar';
import { MobileJoystick } from './components/MobileJoystick';
import { DEFAULT_OUTFIT, getRandomOutfit } from './presets';
import {
  OutfitConfig,
  AnimationAction,
  StageEnvironmentType,
  CameraViewPreset,
  MovementState,
} from './types';
import { sounds } from './audio/soundEffects';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // React State for UI bindings
  const [outfit, setOutfit] = useState<OutfitConfig>(DEFAULT_OUTFIT);
  const [currentAction, setCurrentAction] = useState<AnimationAction>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isFreeRoam, setIsFreeRoam] = useState<boolean>(false);
  const [stagePreset, setStagePreset] = useState<StageEnvironmentType>('neonCyber');
  const [particlesVisible, setParticlesVisible] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('orbit');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Initialize SceneManager once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const handleMovementChange = (state: MovementState) => {
      setCurrentAction(state.currentAction);
      setIsFreeRoam(state.isFreeRoam);
      setPlaybackSpeed(state.playbackSpeed);
    };

    const manager = new SceneManager(mountRef.current, outfit, handleMovementChange);
    sceneManagerRef.current = manager;

    // Keyboard shortcut 'H' to toggle HUD
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        // Toggle HUD via synthetic click or event if needed
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Handlers
  const handleUpdateOutfit = useCallback((newOutfit: OutfitConfig) => {
    setOutfit(newOutfit);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateOutfit(newOutfit);
    }
  }, []);

  const handleSelectAction = useCallback((action: AnimationAction) => {
    setCurrentAction(action);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAction(action);
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setPlaybackSpeed(speed);
    }
  }, []);

  const handleToggleFreeRoam = useCallback((enabled: boolean) => {
    setIsFreeRoam(enabled);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setFreeRoam(enabled);
    }
  }, []);

  const handleSelectStage = useCallback((preset: StageEnvironmentType) => {
    setStagePreset(preset);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setStagePreset(preset);
    }
  }, []);

  const handleToggleParticles = useCallback((visible: boolean) => {
    setParticlesVisible(visible);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setParticlesVisible(visible);
    }
  }, []);

  const handleToggleAutoRotate = useCallback((enabled: boolean) => {
    setAutoRotate(enabled);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAutoRotate(enabled);
    }
  }, []);

  const handleSelectCamera = useCallback((preset: CameraViewPreset) => {
    setCameraPreset(preset);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraPreset(preset);
    }
  }, []);

  const handleRandomize = useCallback(() => {
    const randomOutfit = getRandomOutfit();
    handleUpdateOutfit(randomOutfit);
  }, [handleUpdateOutfit]);

  const handleReset = useCallback(() => {
    handleUpdateOutfit(DEFAULT_OUTFIT);
    handleSelectAction('idle');
    handleSpeedChange(1.0);
    handleToggleFreeRoam(false);
    handleSelectStage('neonCyber');
    handleSelectCamera('orbit');
    handleToggleAutoRotate(false);
  }, [
    handleUpdateOutfit,
    handleSelectAction,
    handleSpeedChange,
    handleToggleFreeRoam,
    handleSelectStage,
    handleSelectCamera,
    handleToggleAutoRotate,
  ]);

  const handleSnapshot = useCallback(() => {
    if (!sceneManagerRef.current) return;
    const dataUrl = sceneManagerRef.current.captureSnapshot();
    const link = document.createElement('a');
    link.download = `nova-character-outfit-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  }, [isMuted]);

  // Mobile virtual joystick handlers
  const handleJoystickVector = useCallback((vx: number, vz: number, isSprinting: boolean) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setJoystickVector(vx, vz, isSprinting);
    }
  }, []);

  const handleJoystickJump = useCallback(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.triggerJump();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-zinc-950 font-sans">
      {/* 3D WebGL Canvas Mount Container - Dedicated ref outside React HUD overlays */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Top Header Bar */}
      <TopBar
        currentAction={currentAction}
        isFreeRoam={isFreeRoam}
        onRandomize={handleRandomize}
        onReset={handleReset}
        onSnapshot={handleSnapshot}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Mobile Virtual Touch Joystick for touch/small screens */}
      <MobileJoystick
        onVectorChange={handleJoystickVector}
        onJump={handleJoystickJump}
        active={isFreeRoam}
      />

      {/* Unified Sleek Collapsible Bottom Dock (Zero Viewport Occlusion) */}
      <BottomDock
        outfit={outfit}
        onUpdateOutfit={handleUpdateOutfit}
        currentAction={currentAction}
        onSelectAction={handleSelectAction}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        isFreeRoam={isFreeRoam}
        onToggleFreeRoam={handleToggleFreeRoam}
        stagePreset={stagePreset}
        onSelectStage={handleSelectStage}
        particlesVisible={particlesVisible}
        onToggleParticles={handleToggleParticles}
        autoRotate={autoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
      />
    </div>
  );
}
