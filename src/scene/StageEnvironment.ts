/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { StageEnvironmentType } from '../types';

export class StageEnvironment {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;

  // Lights
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private underStageLight: THREE.PointLight;

  // Floor & Stage Meshes
  private pedestal: THREE.Mesh;
  private outerRing: THREE.Mesh;
  private ringGlow: THREE.Mesh;
  private groundPlane: THREE.Mesh;
  private contactShadow: THREE.Mesh;

  // Particle System
  private particles: THREE.Points | null = null;
  private particleGeo: THREE.BufferGeometry | null = null;

  // Current Preset
  private currentPreset: StageEnvironmentType = 'neonCyber';

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, isSoftwareGl: boolean) {
    this.scene = scene;
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.group = new THREE.Group();
    this.group.name = 'StageEnvironment';

    // 1. Mandatory Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 2. Lighting Rig
    // Warm directional key light
    this.keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    this.keyLight.position.set(4, 7, 5);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 25;
      const d = 3.5;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Cool Hemisphere fill light (never flat white ambient)
    this.fillLight = new THREE.HemisphereLight(0x90caf9, 0x1e293b, 1.2);
    this.scene.add(this.fillLight);

    // Dramatic Rim light from behind
    this.rimLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    this.rimLight.position.set(-4, 5, -5);
    this.scene.add(this.rimLight);

    // Under-stage uplight for theatrical glow
    this.underStageLight = new THREE.PointLight(0x00f0ff, 2.0, 6, 2);
    this.underStageLight.position.set(0, 0.4, 0);
    this.scene.add(this.underStageLight);

    // 3. Stage & Pedestal Architecture
    // Circular stage platform flush at Y = 0 (top surface at Y = 0)
    const pedestalGeo = new THREE.CylinderGeometry(2.8, 3.1, 0.16, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.25,
      metalness: 0.75,
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.set(0, -0.08, 0);
    this.pedestal.receiveShadow = !this.isSoftwareGl;
    this.group.add(this.pedestal);

    // Neon glowing perimeter ring
    const ringGeo = new THREE.TorusGeometry(2.78, 0.025, 8, 48);
    ringGeo.rotateX(Math.PI * 0.5);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    this.ringGlow = new THREE.Mesh(ringGeo, ringMat);
    this.ringGlow.position.set(0, 0.005, 0);
    this.group.add(this.ringGlow);

    // Concentric outer accent ring
    const outerGeo = new THREE.TorusGeometry(3.2, 0.04, 8, 48);
    outerGeo.rotateX(Math.PI * 0.5);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.position.set(0, -0.15, 0);
    this.group.add(this.outerRing);

    // Ground plane extending to horizon with natural fog blending
    const groundGeo = new THREE.PlaneGeometry(60, 60, 2, 2);
    groundGeo.rotateX(-Math.PI * 0.5);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.85,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.position.set(0, -0.165, 0);
    this.groundPlane.receiveShadow = !this.isSoftwareGl;
    this.group.add(this.groundPlane);

    // Soft radial contact shadow under the platform
    const shadowGeo = new THREE.CircleGeometry(3.6, 32);
    shadowGeo.rotateX(-Math.PI * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(0, -0.16, 0);
    this.group.add(this.contactShadow);

    // 4. Ambient Spark / Dust Particles
    this.initParticles();

    this.scene.add(this.group);

    // Apply default preset
    this.applyPreset('neonCyber');
  }

  private initParticles() {
    const particleCount = this.isSoftwareGl ? 60 : 180;
    this.particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.0 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0.1 + Math.random() * 3.2;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
      scales[i] = Math.random() * 0.04 + 0.015;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.particleGeo, particleMat);
    this.group.add(this.particles);
  }

  public applyPreset(preset: StageEnvironmentType) {
    this.currentPreset = preset;

    switch (preset) {
      case 'neonCyber': {
        this.scene.background = new THREE.Color(0x07090e);
        this.scene.fog = new THREE.FogExp2(0x07090e, 0.06);

        this.keyLight.color.set(0xecfeff);
        this.keyLight.intensity = 2.4;
        this.fillLight.color.set(0x38bdf8);
        this.fillLight.groundColor.set(0x09090b);
        this.fillLight.intensity = 1.2;
        this.rimLight.color.set(0xf43f5e); // Neon magenta rim
        this.rimLight.intensity = 2.2;

        (this.ringGlow.material as THREE.MeshStandardMaterial).color.set(0x00f0ff);
        (this.ringGlow.material as THREE.MeshStandardMaterial).emissive.set(0x00f0ff);
        this.underStageLight.color.set(0x00f0ff);

        if (this.particles) {
          (this.particles.material as THREE.PointsMaterial).color.set(0x00f0ff);
        }
        break;
      }

      case 'cleanStudio': {
        this.scene.background = new THREE.Color(0x18181b);
        this.scene.fog = new THREE.FogExp2(0x18181b, 0.04);

        this.keyLight.color.set(0xfff8ee);
        this.keyLight.intensity = 2.8;
        this.fillLight.color.set(0x94a3b8);
        this.fillLight.groundColor.set(0x27272a);
        this.fillLight.intensity = 1.4;
        this.rimLight.color.set(0xe2e8f0);
        this.rimLight.intensity = 1.5;

        (this.ringGlow.material as THREE.MeshStandardMaterial).color.set(0x3b82f6);
        (this.ringGlow.material as THREE.MeshStandardMaterial).emissive.set(0x3b82f6);
        this.underStageLight.color.set(0x3b82f6);

        if (this.particles) {
          (this.particles.material as THREE.PointsMaterial).color.set(0x60a5fa);
        }
        break;
      }

      case 'deepNebula': {
        this.scene.background = new THREE.Color(0x0b0716);
        this.scene.fog = new THREE.FogExp2(0x0b0716, 0.05);

        this.keyLight.color.set(0xd8b4fe);
        this.keyLight.intensity = 2.0;
        this.fillLight.color.set(0x7e22ce);
        this.fillLight.groundColor.set(0x050508);
        this.fillLight.intensity = 1.3;
        this.rimLight.color.set(0x818cf8);
        this.rimLight.intensity = 2.4;

        (this.ringGlow.material as THREE.MeshStandardMaterial).color.set(0xa855f7);
        (this.ringGlow.material as THREE.MeshStandardMaterial).emissive.set(0xa855f7);
        this.underStageLight.color.set(0xa855f7);

        if (this.particles) {
          (this.particles.material as THREE.PointsMaterial).color.set(0xc084fc);
        }
        break;
      }

      case 'sunsetGold': {
        this.scene.background = new THREE.Color(0x1a0f12);
        this.scene.fog = new THREE.FogExp2(0x1a0f12, 0.05);

        this.keyLight.color.set(0xfbbf24); // warm golden amber
        this.keyLight.intensity = 2.6;
        this.fillLight.color.set(0xf472b6); // twilight rose fill
        this.fillLight.groundColor.set(0x1e1b2e);
        this.fillLight.intensity = 1.3;
        this.rimLight.color.set(0xf97316); // fiery rim
        this.rimLight.intensity = 2.0;

        (this.ringGlow.material as THREE.MeshStandardMaterial).color.set(0xf59e0b);
        (this.ringGlow.material as THREE.MeshStandardMaterial).emissive.set(0xf59e0b);
        this.underStageLight.color.set(0xf59e0b);

        if (this.particles) {
          (this.particles.material as THREE.PointsMaterial).color.set(0xfcd34d);
        }
        break;
      }
    }
  }

  public update(delta: number) {
    // Gentle rotation of the outer ring and slow particle drift
    this.outerRing.rotation.z += delta * 0.08;

    if (this.particles && this.particleGeo) {
      const positions = this.particleGeo.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        // Slow vertical ascent
        positions[i * 3 + 1] += delta * 0.2;
        if (positions[i * 3 + 1] > 3.4) {
          positions[i * 3 + 1] = 0.1;
        }
      }
      this.particleGeo.attributes.position.needsUpdate = true;
    }
  }

  public setParticlesVisible(visible: boolean) {
    if (this.particles) {
      this.particles.visible = visible;
    }
  }

  public dispose() {
    if (this.particleGeo) this.particleGeo.dispose();
    this.pedestal.geometry.dispose();
    this.ringGlow.geometry.dispose();
    this.outerRing.geometry.dispose();
    this.groundPlane.geometry.dispose();
    this.contactShadow.geometry.dispose();
  }
}
