/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterModel } from './CharacterModel';
import { StageEnvironment } from './StageEnvironment';
import {
  OutfitConfig,
  AnimationAction,
  StageEnvironmentType,
  CameraViewPreset,
  MovementState,
} from '../types';

// Detect software WebGL per Three.js skill directive
const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

// Scratch math vectors to avoid GC
const _camTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

export class SceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private character: CharacterModel;
  private environment: StageEnvironment;

  private clock: THREE.Clock;
  private frameId: number = 0;
  private isDisposed: boolean = false;

  // Camera preset animation
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, 1.4, 3.8);
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.0, 0);
  private currentCameraPreset: CameraViewPreset = 'orbit';
  private isTransitioningCamera: boolean = false;

  // Turntable auto-rotate
  private autoRotateTurntable: boolean = false;
  private turntableSpeed: number = 0.5;

  // Direct Control / Free-Roam State
  private movementState: MovementState;
  private keysPressed: Record<string, boolean> = {};
  private onMovementChangeCallback?: (state: MovementState) => void;

  constructor(
    container: HTMLElement,
    initialOutfit: OutfitConfig,
    onMovementChange?: (state: MovementState) => void
  ) {
    this.container = container;
    this.onMovementChangeCallback = onMovementChange;
    this.clock = new THREE.Clock();

    this.movementState = {
      currentAction: 'idle',
      playbackSpeed: 1.0,
      isFreeRoam: false,
      isMoving: false,
      isGrounded: true,
      velocity: { x: 0, z: 0 },
      heading: 0,
    };

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for camera photo snapshots
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      42,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      60
    );
    this.camera.position.copy(this.targetCameraPos);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(this.targetLookAt);
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 12.0;
    this.controls.maxPolarAngle = Math.PI * 0.52; // Don't go deep below ground

    // Cancel scripted camera transitions if user interacts with controls
    this.controls.addEventListener('start', () => {
      this.isTransitioningCamera = false;
    });

    // 4. Initialize Environment & Character
    this.environment = new StageEnvironment(this.scene, this.renderer, isSoftwareGl);
    this.character = new CharacterModel(initialOutfit);
    this.scene.add(this.character.group);

    // 5. Pre-warm shaders
    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 6. Keyboard & Resize Event Listeners
    this.setupEventListeners();

    // 7. Start Render Loop
    this.tick();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onResize = () => {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Only capture movement keys if free roam is enabled or if WASD pressed
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' '].includes(key)) {
      this.keysPressed[key] = true;
      if (!this.movementState.isFreeRoam && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        // Auto-enable free roam on WASD
        this.setFreeRoam(true);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (this.keysPressed[key]) {
      this.keysPressed[key] = false;
    }
  };

  // Virtual Joystick input for mobile
  public setJoystickVector(vx: number, vz: number, isSprinting: boolean = false) {
    if (Math.hypot(vx, vz) > 0.05) {
      this.keysPressed['joystick'] = true;
      this.joystickX = vx;
      this.joystickZ = vz;
      this.joystickSprint = isSprinting;
      if (!this.movementState.isFreeRoam) {
        this.setFreeRoam(true);
      }
    } else {
      this.keysPressed['joystick'] = false;
      this.joystickX = 0;
      this.joystickZ = 0;
    }
  }

  private joystickX = 0;
  private joystickZ = 0;
  private joystickSprint = false;

  public triggerJump() {
    this.keysPressed[' '] = true;
    setTimeout(() => {
      this.keysPressed[' '] = false;
    }, 150);
  }

  // Camera Presets
  public setCameraPreset(preset: CameraViewPreset) {
    this.currentCameraPreset = preset;
    this.isTransitioningCamera = true;

    const charPos = this.character.group.position;

    switch (preset) {
      case 'portrait':
        this.targetCameraPos.set(charPos.x, charPos.y + 1.55, charPos.z + 1.1);
        this.targetLookAt.set(charPos.x, charPos.y + 1.5, charPos.z);
        break;
      case 'torso':
        this.targetCameraPos.set(charPos.x, charPos.y + 1.25, charPos.z + 1.8);
        this.targetLookAt.set(charPos.x, charPos.y + 1.15, charPos.z);
        break;
      case 'footwear':
        this.targetCameraPos.set(charPos.x, charPos.y + 0.35, charPos.z + 1.4);
        this.targetLookAt.set(charPos.x, charPos.y + 0.18, charPos.z);
        break;
      case 'actionFollow':
        // Over-the-shoulder follow cam
        this.targetCameraPos.set(charPos.x, charPos.y + 1.7, charPos.z + 3.2);
        this.targetLookAt.set(charPos.x, charPos.y + 1.0, charPos.z);
        break;
      case 'orbit':
      default:
        this.targetCameraPos.set(charPos.x, charPos.y + 1.4, charPos.z + 3.8);
        this.targetLookAt.set(charPos.x, charPos.y + 1.0, charPos.z);
        break;
    }
  }

  // Animation Action
  public setAction(action: AnimationAction) {
    this.movementState.currentAction = action;
    this.character.setAction(action);
    this.onMovementChangeCallback?.({ ...this.movementState });
  }

  public setPlaybackSpeed(speed: number) {
    this.movementState.playbackSpeed = speed;
    this.onMovementChangeCallback?.({ ...this.movementState });
  }

  public setFreeRoam(enabled: boolean) {
    this.movementState.isFreeRoam = enabled;
    if (!enabled) {
      // Return character to center smoothly
      this.character.group.position.set(0, 0, 0);
      this.character.group.rotation.y = 0;
      this.setAction('idle');
    }
    this.onMovementChangeCallback?.({ ...this.movementState });
  }

  public setAutoRotate(enabled: boolean, speed: number = 0.5) {
    this.autoRotateTurntable = enabled;
    this.turntableSpeed = speed;
  }

  public updateOutfit(config: OutfitConfig) {
    this.character.updateConfig(config);
  }

  public setStagePreset(preset: StageEnvironmentType) {
    this.environment.applyPreset(preset);
  }

  public setParticlesVisible(visible: boolean) {
    this.environment.setParticlesVisible(visible);
  }

  // Photo Snapshot capture
  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // --- Animation & Physics Loop ---
  private tick = () => {
    if (this.isDisposed) return;

    const delta = this.clock.getDelta();
    const dt = Math.min(delta, 0.1);

    // 1. Process Character Free-Roam Movement if enabled
    this.updateCharacterPhysics(dt);

    // 2. Update Character Procedural Joint Kinematics
    this.character.update(dt, this.movementState.playbackSpeed);

    // 3. Update Stage (outer ring rotation, floating dust particles)
    this.environment.update(dt);

    // 4. Update Camera Transitions / Tracking
    this.updateCamera(dt);

    // 5. Render Scene
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.frameId = requestAnimationFrame(this.tick);
  };

  private updateCharacterPhysics(dt: number) {
    if (!this.movementState.isFreeRoam) return;

    let moveX = 0;
    let moveZ = 0;

    if (this.keysPressed['w'] || this.keysPressed['arrowup']) moveZ -= 1;
    if (this.keysPressed['s'] || this.keysPressed['arrowdown']) moveZ += 1;
    if (this.keysPressed['a'] || this.keysPressed['arrowleft']) moveX -= 1;
    if (this.keysPressed['d'] || this.keysPressed['arrowright']) moveX += 1;

    // Add joystick input if active
    if (this.keysPressed['joystick']) {
      moveX += this.joystickX;
      moveZ += this.joystickZ;
    }

    const isSprint = this.keysPressed['shift'] || this.joystickSprint;
    const isJump = this.keysPressed[' '];

    const len = Math.hypot(moveX, moveZ);
    const isMoving = len > 0.08;

    if (isJump) {
      if (this.movementState.currentAction !== 'jump') {
        this.setAction('jump');
      }
    } else if (isMoving) {
      const targetAction: AnimationAction = isSprint ? 'sprint' : 'run';
      if (this.movementState.currentAction !== targetAction) {
        this.setAction(targetAction);
      }
    } else if (!isJump && ['walk', 'run', 'sprint', 'jump'].includes(this.movementState.currentAction)) {
      this.setAction('idle');
    }

    if (isMoving) {
      // Normalize direction relative to camera angle
      const camYaw = Math.atan2(
        this.camera.position.x - this.controls.target.x,
        this.camera.position.z - this.controls.target.z
      );

      _moveDir.set(moveX / Math.max(1, len), 0, moveZ / Math.max(1, len));
      _moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);

      const moveSpeed = isSprint ? 4.8 : 2.8;
      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);

      // Smooth rotate character toward move direction
      let currentAngle = this.character.group.rotation.y;
      // Handle radian wrap-around
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.character.group.rotation.y += diff * Math.min(1.0, dt * 14);

      // Advance position
      this.character.group.position.x += _moveDir.x * moveSpeed * dt;
      this.character.group.position.z += _moveDir.z * moveSpeed * dt;

      // Arena boundary clamp (circular radius ~4.2m)
      const distFromCenter = Math.hypot(this.character.group.position.x, this.character.group.position.z);
      if (distFromCenter > 4.2) {
        const factor = 4.2 / distFromCenter;
        this.character.group.position.x *= factor;
        this.character.group.position.z *= factor;
      }
    }

    this.movementState.isMoving = isMoving;
  }

  private updateCamera(dt: number) {
    const charPos = this.character.group.position;

    // Follow camera mode in free roam
    if (this.movementState.isFreeRoam || this.currentCameraPreset === 'actionFollow') {
      const targetLook = _camTarget.set(charPos.x, charPos.y + 1.1, charPos.z);
      this.controls.target.lerp(targetLook, Math.min(1.0, dt * 6));
    }

    // Auto-turntable rotation
    if (this.autoRotateTurntable && !this.isTransitioningCamera) {
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = this.turntableSpeed * 2.0;
    } else {
      this.controls.autoRotate = false;
    }

    // Smooth camera transition when user clicked a preset
    if (this.isTransitioningCamera) {
      this.camera.position.lerp(this.targetCameraPos, Math.min(1.0, dt * 7));
      this.controls.target.lerp(this.targetLookAt, Math.min(1.0, dt * 7));

      if (
        this.camera.position.distanceTo(this.targetCameraPos) < 0.05 &&
        this.controls.target.distanceTo(this.targetLookAt) < 0.05
      ) {
        this.isTransitioningCamera = false;
      }
    }
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.controls.dispose();
    this.character.dispose();
    this.environment.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
