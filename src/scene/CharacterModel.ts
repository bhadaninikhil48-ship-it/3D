/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OutfitConfig, AnimationAction, MaterialFinish } from '../types';
import { sounds } from '../audio/soundEffects';

// Pre-allocated scratch objects for zero GC in animation loop
const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

// Procedural Canvas Textures (zero external 404 dependencies)
function createCarbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 128, 128);

  // Checkerboard carbon weave
  ctx.fillStyle = '#27272a';
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  // Micro highlight lines
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  for (let i = 0; i < 128; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 8, 8);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHexGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;

  const r = 20;
  const h = r * Math.sin(Math.PI / 3);
  const w = r * 1.5;

  for (let y = -h; y < 256 + h; y += h * 2) {
    for (let x = -w; x < 256 + w; x += w * 2) {
      drawHex(ctx, x, y, r);
      drawHex(ctx, x + w, y + h, r);
    }
  }

  function drawHex(c: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = cx + radius * Math.cos(angle);
      const hy = cy + radius * Math.sin(angle);
      if (i === 0) c.moveTo(hx, hy);
      else c.lineTo(hx, hy);
    }
    c.closePath();
    c.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class CharacterModel {
  public group: THREE.Group;

  // Hierarchical Skeleton Joints
  private pelvisJoint: THREE.Group;
  private spineJoint: THREE.Group;
  private chestJoint: THREE.Group;
  private neckJoint: THREE.Group;
  private headJoint: THREE.Group;

  // Limbs
  private leftShoulderJoint: THREE.Group;
  private leftElbowJoint: THREE.Group;
  private leftHandJoint: THREE.Group;

  private rightShoulderJoint: THREE.Group;
  private rightElbowJoint: THREE.Group;
  private rightHandJoint: THREE.Group;

  private leftHipJoint: THREE.Group;
  private leftKneeJoint: THREE.Group;
  private leftFootJoint: THREE.Group;

  private rightHipJoint: THREE.Group;
  private rightKneeJoint: THREE.Group;
  private rightFootJoint: THREE.Group;

  // Accessory Mount Nodes
  private headgearNode: THREE.Group;
  private torsoNode: THREE.Group;
  private shoulderGuardsNode: THREE.Group;
  private legsNode: THREE.Group;
  private footwearNode: THREE.Group;
  private backGearNode: THREE.Group;

  // Particle / Foot contact sparks
  private footContactShadowLeft: THREE.Mesh;
  private footContactShadowRight: THREE.Mesh;

  // Materials & PBR finishes
  private primaryMat!: THREE.MeshStandardMaterial;
  private secondaryMat!: THREE.MeshStandardMaterial;
  private accentMat!: THREE.MeshStandardMaterial;
  private emissiveMat!: THREE.MeshStandardMaterial;
  private skinMat!: THREE.MeshStandardMaterial;
  private hairMat!: THREE.MeshStandardMaterial;
  private carbonMat!: THREE.MeshStandardMaterial;
  private visorMat!: THREE.MeshPhysicalMaterial;

  private carbonTexture: THREE.CanvasTexture;
  private hexTexture: THREE.CanvasTexture;

  // Current config & state
  private config: OutfitConfig;
  private action: AnimationAction = 'idle';
  private animTime: number = 0;
  private lastFootstepTime: number = 0;

  // Damping targets for smooth FK motion
  private targets: Record<string, { rx: number; ry: number; rz: number; px?: number; py?: number; pz?: number }> = {};

  constructor(initialConfig: OutfitConfig) {
    this.config = initialConfig;
    this.group = new THREE.Group();
    this.group.name = 'HeroCharacter';

    // Build procedural textures
    this.carbonTexture = createCarbonTexture();
    this.hexTexture = createHexGridTexture();

    // Create materials
    this.initMaterials();

    // Build hierarchical articulated skeleton
    this.pelvisJoint = new THREE.Group();
    this.spineJoint = new THREE.Group();
    this.chestJoint = new THREE.Group();
    this.neckJoint = new THREE.Group();
    this.headJoint = new THREE.Group();

    this.leftShoulderJoint = new THREE.Group();
    this.leftElbowJoint = new THREE.Group();
    this.leftHandJoint = new THREE.Group();

    this.rightShoulderJoint = new THREE.Group();
    this.rightElbowJoint = new THREE.Group();
    this.rightHandJoint = new THREE.Group();

    this.leftHipJoint = new THREE.Group();
    this.leftKneeJoint = new THREE.Group();
    this.leftFootJoint = new THREE.Group();

    this.rightHipJoint = new THREE.Group();
    this.rightKneeJoint = new THREE.Group();
    this.rightFootJoint = new THREE.Group();

    this.headgearNode = new THREE.Group();
    this.torsoNode = new THREE.Group();
    this.shoulderGuardsNode = new THREE.Group();
    this.legsNode = new THREE.Group();
    this.footwearNode = new THREE.Group();
    this.backGearNode = new THREE.Group();

    // Setup hierarchy
    this.buildSkeletonHierarchy();

    // Base body geometry (always present under modular outfit layers)
    this.buildBaseHumanoidAnatomy();

    // Contact shadows for feet
    const shadowGeo = new THREE.CircleGeometry(0.22, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.footContactShadowLeft = new THREE.Mesh(shadowGeo, shadowMat);
    this.footContactShadowRight = new THREE.Mesh(shadowGeo, shadowMat);
    this.group.add(this.footContactShadowLeft);
    this.group.add(this.footContactShadowRight);

    // Apply outfit & style meshes
    this.rebuildOutfit();
  }

  private initMaterials() {
    this.primaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.primaryColor),
      roughness: 0.3,
      metalness: 0.2,
    });

    this.secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.secondaryColor),
      roughness: 0.4,
      metalness: 0.1,
    });

    this.accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.accentColor),
      roughness: 0.2,
      metalness: 0.8,
    });

    this.emissiveMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.glowColor),
      emissive: new THREE.Color(this.config.glowColor),
      emissiveIntensity: this.config.glowIntensity,
      roughness: 0.1,
      metalness: 0.0,
    });

    this.skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.skinTone),
      roughness: 0.65,
      metalness: 0.0,
    });

    this.hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.hairColor),
      roughness: 0.5,
      metalness: 0.1,
    });

    this.carbonMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      bumpMap: this.carbonTexture,
      bumpScale: 0.04,
      roughness: 0.35,
      metalness: 0.4,
    });

    this.visorMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.config.glowColor),
      emissive: new THREE.Color(this.config.glowColor),
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.3,
      transparent: true,
      opacity: 0.9,
    });

    this.applyMaterialFinish(this.config.finish);
  }

  private applyMaterialFinish(finish: MaterialFinish) {
    switch (finish) {
      case 'matte':
        this.primaryMat.roughness = 0.8;
        this.primaryMat.metalness = 0.05;
        this.primaryMat.bumpMap = null;
        this.secondaryMat.roughness = 0.75;
        this.secondaryMat.metalness = 0.05;
        break;
      case 'metallic':
        this.primaryMat.roughness = 0.2;
        this.primaryMat.metalness = 0.85;
        this.primaryMat.bumpMap = null;
        this.secondaryMat.roughness = 0.25;
        this.secondaryMat.metalness = 0.75;
        break;
      case 'glossy':
        this.primaryMat.roughness = 0.12;
        this.primaryMat.metalness = 0.1;
        this.primaryMat.bumpMap = null;
        this.secondaryMat.roughness = 0.2;
        this.secondaryMat.metalness = 0.1;
        break;
      case 'carbon':
        this.primaryMat.bumpMap = this.carbonTexture;
        this.primaryMat.bumpScale = 0.06;
        this.primaryMat.roughness = 0.3;
        this.primaryMat.metalness = 0.3;
        this.secondaryMat.bumpMap = this.hexTexture;
        this.secondaryMat.bumpScale = 0.04;
        break;
      case 'holographic':
        this.primaryMat.roughness = 0.1;
        this.primaryMat.metalness = 0.95;
        this.primaryMat.bumpMap = null;
        this.secondaryMat.roughness = 0.15;
        this.secondaryMat.metalness = 0.9;
        break;
    }
    this.primaryMat.needsUpdate = true;
    this.secondaryMat.needsUpdate = true;
  }

  private buildSkeletonHierarchy() {
    // Root group holds the character, centered and flush with ground at Y = 0
    this.group.add(this.pelvisJoint);
    this.pelvisJoint.position.set(0, 0.98, 0); // Pelvis height

    // Spine and Chest
    this.pelvisJoint.add(this.spineJoint);
    this.spineJoint.position.set(0, 0.18, 0);

    this.spineJoint.add(this.chestJoint);
    this.chestJoint.position.set(0, 0.28, 0);

    // Neck and Head
    this.chestJoint.add(this.neckJoint);
    this.neckJoint.position.set(0, 0.32, 0);

    this.neckJoint.add(this.headJoint);
    this.headJoint.position.set(0, 0.14, 0);

    // Arms Left
    this.chestJoint.add(this.leftShoulderJoint);
    this.leftShoulderJoint.position.set(0.28, 0.22, 0);

    this.leftShoulderJoint.add(this.leftElbowJoint);
    this.leftElbowJoint.position.set(0.04, -0.32, 0);

    this.leftElbowJoint.add(this.leftHandJoint);
    this.leftHandJoint.position.set(0, -0.28, 0);

    // Arms Right
    this.chestJoint.add(this.rightShoulderJoint);
    this.rightShoulderJoint.position.set(-0.28, 0.22, 0);

    this.rightShoulderJoint.add(this.rightElbowJoint);
    this.rightElbowJoint.position.set(-0.04, -0.32, 0);

    this.rightElbowJoint.add(this.rightHandJoint);
    this.rightHandJoint.position.set(0, -0.28, 0);

    // Legs Left
    this.pelvisJoint.add(this.leftHipJoint);
    this.leftHipJoint.position.set(0.14, -0.06, 0);

    this.leftHipJoint.add(this.leftKneeJoint);
    this.leftKneeJoint.position.set(0, -0.44, 0);

    this.leftKneeJoint.add(this.leftFootJoint);
    this.leftFootJoint.position.set(0, -0.44, 0);

    // Legs Right
    this.pelvisJoint.add(this.rightHipJoint);
    this.rightHipJoint.position.set(-0.14, -0.06, 0);

    this.rightHipJoint.add(this.rightKneeJoint);
    this.rightKneeJoint.position.set(0, -0.44, 0);

    this.rightKneeJoint.add(this.rightFootJoint);
    this.rightFootJoint.position.set(0, -0.44, 0);

    // Accessory slots
    this.headJoint.add(this.headgearNode);
    this.chestJoint.add(this.torsoNode);
    this.chestJoint.add(this.shoulderGuardsNode);
    this.pelvisJoint.add(this.legsNode);
    this.chestJoint.add(this.backGearNode);

    // Footwear mounts on feet
    this.leftFootJoint.add(this.footwearNode);
  }

  private buildBaseHumanoidAnatomy() {
    // 1. Head: Stylized shaped head with bevels
    const headGroup = new THREE.Group();
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 16),
      this.skinMat
    );
    headMesh.scale.set(1.0, 1.15, 1.05);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Jaw / Chin profile
    const chinMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.16, 16),
      this.skinMat
    );
    chinMesh.position.set(0, -0.1, 0.05);
    chinMesh.rotation.x = Math.PI * 0.15;
    headGroup.add(chinMesh);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.04, 8, 8);
    earGeo.scale(0.5, 1.0, 0.8);
    const earLeft = new THREE.Mesh(earGeo, this.skinMat);
    earLeft.position.set(0.16, 0, 0);
    const earRight = earLeft.clone();
    earRight.position.set(-0.16, 0, 0);
    headGroup.add(earLeft, earRight);

    // Cyber Ocular Strip / Eyes (glows subtly)
    const eyeBandGeo = new THREE.CylinderGeometry(0.162, 0.162, 0.04, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const eyeBand = new THREE.Mesh(eyeBandGeo, this.emissiveMat);
    eyeBand.position.set(0, 0.02, 0);
    eyeBand.rotation.y = Math.PI * 0.5;
    headGroup.add(eyeBand);

    this.headJoint.add(headGroup);

    // 2. Neck
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12),
      this.skinMat
    );
    neckMesh.position.set(0, 0.07, 0);
    this.neckJoint.add(neckMesh);

    // 3. Hands
    const handGeo = new THREE.BoxGeometry(0.06, 0.1, 0.04);
    const leftHandMesh = new THREE.Mesh(handGeo, this.skinMat);
    leftHandMesh.position.set(0, -0.05, 0);
    leftHandMesh.castShadow = true;
    this.leftHandJoint.add(leftHandMesh);

    const rightHandMesh = leftHandMesh.clone();
    this.rightHandJoint.add(rightHandMesh);
  }

  // Outfit Rebuilder
  public updateConfig(newConfig: OutfitConfig) {
    const prevFinish = this.config.finish;
    const prevGlow = this.config.glowColor;
    const prevPrimary = this.config.primaryColor;
    const prevSecondary = this.config.secondaryColor;
    const prevAccent = this.config.accentColor;
    const prevSkin = this.config.skinTone;
    const prevHair = this.config.hairColor;
    const prevIntensity = this.config.glowIntensity;

    const needsMeshRebuild = 
      this.config.headgear !== newConfig.headgear ||
      this.config.torso !== newConfig.torso ||
      this.config.shoulders !== newConfig.shoulders ||
      this.config.legs !== newConfig.legs ||
      this.config.footwear !== newConfig.footwear ||
      this.config.backGear !== newConfig.backGear;

    this.config = newConfig;

    // Update material colors
    if (prevPrimary !== newConfig.primaryColor) {
      this.primaryMat.color.set(newConfig.primaryColor);
    }
    if (prevSecondary !== newConfig.secondaryColor) {
      this.secondaryMat.color.set(newConfig.secondaryColor);
    }
    if (prevAccent !== newConfig.accentColor) {
      this.accentMat.color.set(newConfig.accentColor);
    }
    if (prevSkin !== newConfig.skinTone) {
      this.skinMat.color.set(newConfig.skinTone);
    }
    if (prevHair !== newConfig.hairColor) {
      this.hairMat.color.set(newConfig.hairColor);
    }
    if (prevGlow !== newConfig.glowColor || prevIntensity !== newConfig.glowIntensity) {
      this.emissiveMat.color.set(newConfig.glowColor);
      this.emissiveMat.emissive.set(newConfig.glowColor);
      this.emissiveMat.emissiveIntensity = newConfig.glowIntensity;
      this.visorMat.color.set(newConfig.glowColor);
      this.visorMat.emissive.set(newConfig.glowColor);
    }
    if (prevFinish !== newConfig.finish) {
      this.applyMaterialFinish(newConfig.finish);
    }

    if (needsMeshRebuild) {
      this.rebuildOutfit();
    }
  }

  private clearGroup(g: THREE.Group) {
    while (g.children.length > 0) {
      const child = g.children[0];
      g.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
  }

  public rebuildOutfit() {
    // Clear dynamic modular nodes
    this.clearGroup(this.headgearNode);
    this.clearGroup(this.torsoNode);
    this.clearGroup(this.shoulderGuardsNode);
    this.clearGroup(this.legsNode);
    this.clearGroup(this.footwearNode);
    this.clearGroup(this.backGearNode);

    // Rebuild components with 3-12 parts each, composite detailing
    this.buildHeadgear();
    this.buildTorso();
    this.buildShoulders();
    this.buildLegs();
    this.buildFootwear();
    this.buildBackGear();
  }

  // --- 1. HEADGEAR & HAIR ---
  private buildHeadgear() {
    // Default styled cyber-hair if not fully covered
    const hairGroup = new THREE.Group();
    const hairCrownGeo = new THREE.ConeGeometry(0.17, 0.2, 8);
    hairCrownGeo.rotateX(-Math.PI * 0.15);
    const hairCrown = new THREE.Mesh(hairCrownGeo, this.hairMat);
    hairCrown.position.set(0, 0.12, -0.04);
    hairGroup.add(hairCrown);

    // Fringe sweeps
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.15, 4),
        this.hairMat
      );
      spike.position.set(i * 0.05, 0.12, 0.13);
      spike.rotation.set(-0.4, 0, i * 0.15);
      hairGroup.add(spike);
    }
    this.headgearNode.add(hairGroup);

    // Slot options
    switch (this.config.headgear) {
      case 'cyberVisor': {
        // High-tech curved aerodynamic visor with glowing frame
        const visor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.07, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
          this.visorMat
        );
        visor.rotation.y = Math.PI * 0.5;
        visor.position.set(0, 0.02, 0.03);

        const frameTop = new THREE.Mesh(
          new THREE.TorusGeometry(0.182, 0.015, 6, 16, Math.PI * 0.8),
          this.accentMat
        );
        frameTop.rotation.y = -Math.PI * 0.9;
        frameTop.rotation.x = Math.PI * 0.5;
        frameTop.position.set(0, 0.055, 0);

        const earpieces = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8),
          this.emissiveMat
        );
        earpieces.rotation.z = Math.PI * 0.5;
        earpieces.position.set(0.18, 0.02, 0);

        const earpiecesRight = earpieces.clone();
        earpiecesRight.position.set(-0.18, 0.02, 0);

        this.headgearNode.add(visor, frameTop, earpieces, earpiecesRight);
        break;
      }

      case 'tacticalCowl': {
        // Armored rebreather mask + tech cowl
        const mask = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.12, 0.12),
          this.secondaryMat
        );
        mask.position.set(0, -0.06, 0.13);

        const filterL = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12),
          this.accentMat
        );
        filterL.rotation.z = Math.PI * 0.5;
        filterL.position.set(0.08, -0.06, 0.14);

        const filterR = filterL.clone();
        filterR.position.set(-0.08, -0.06, 0.14);

        const neonSlit = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.015, 0.02),
          this.emissiveMat
        );
        neonSlit.position.set(0, -0.05, 0.19);

        this.headgearNode.add(mask, filterL, filterR, neonSlit);
        break;
      }

      case 'celestialHalo': {
        // Floating luminescent segmented ring above head
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.24, 0.016, 8, 32),
          this.accentMat
        );
        ring.rotation.x = Math.PI * 0.45;
        ring.position.set(0, 0.28, -0.05);

        // Halo energy emitters
        for (let i = 0; i < 4; i++) {
          const gem = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.035),
            this.emissiveMat
          );
          const ang = (Math.PI / 2) * i;
          gem.position.set(Math.cos(ang) * 0.24, 0.28, -0.05 + Math.sin(ang) * 0.24 * 0.4);
          this.headgearNode.add(gem);
        }
        this.headgearNode.add(ring);
        break;
      }

      case 'mechaHorns': {
        // Angular cyber horns / aerodynamic fins
        const hornGeo = new THREE.ConeGeometry(0.04, 0.28, 4);
        const hornL = new THREE.Mesh(hornGeo, this.primaryMat);
        hornL.position.set(0.14, 0.2, 0);
        hornL.rotation.set(0.2, 0, -0.4);

        const hornR = new THREE.Mesh(hornGeo, this.primaryMat);
        hornR.position.set(-0.14, 0.2, 0);
        hornR.rotation.set(0.2, 0, 0.4);

        const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), this.emissiveMat);
        tipL.position.set(0.23, 0.32, 0.03);

        const tipR = tipL.clone();
        tipR.position.set(-0.23, 0.32, 0.03);

        this.headgearNode.add(hornL, hornR, tipL, tipR);
        break;
      }

      default:
        break;
    }
  }

  // --- 2. TORSO & CHEST ---
  private buildTorso() {
    // Core base armature attached to chestJoint
    const chestGroup = new THREE.Group();

    switch (this.config.torso) {
      case 'techJacket': {
        // Cyberpunk high-collar open jacket with neon piping
        const jacketBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.44, 0.28),
          this.primaryMat
        );
        jacketBody.position.set(0, 0.12, 0);
        jacketBody.castShadow = true;

        // High upturned collar
        const collarBack = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.14, 0.06),
          this.secondaryMat
        );
        collarBack.position.set(0, 0.35, -0.12);

        const collarL = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.14, 0.2),
          this.secondaryMat
        );
        collarL.position.set(0.17, 0.35, -0.02);
        collarL.rotation.y = -0.2;

        const collarR = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.14, 0.2),
          this.secondaryMat
        );
        collarR.position.set(-0.17, 0.35, -0.02);
        collarR.rotation.y = 0.2;

        // Front lapel neon zipper stripes
        const stripeL = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.44, 0.02),
          this.emissiveMat
        );
        stripeL.position.set(0.08, 0.12, 0.145);

        const stripeR = stripeL.clone();
        stripeR.position.set(-0.08, 0.12, 0.145);

        // Chest tech badge
        const badge = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16),
          this.emissiveMat
        );
        badge.rotation.x = Math.PI * 0.5;
        badge.position.set(-0.14, 0.22, 0.145);

        chestGroup.add(jacketBody, collarBack, collarL, collarR, stripeL, stripeR, badge);
        break;
      }

      case 'platedArmor': {
        // Heavy multi-plate exo-chest with arc reactor
        const chestPlate = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.36, 0.26),
          this.primaryMat
        );
        chestPlate.position.set(0, 0.16, 0.02);
        chestPlate.castShadow = true;

        // Arc reactor core
        const reactorRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.07, 0.015, 8, 20),
          this.accentMat
        );
        reactorRing.position.set(0, 0.2, 0.155);

        const reactorCore = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16),
          this.emissiveMat
        );
        reactorCore.rotation.x = Math.PI * 0.5;
        reactorCore.position.set(0, 0.2, 0.15);

        // Abdominal segments
        for (let i = 0; i < 3; i++) {
          const abPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.36 - i * 0.04, 0.07, 0.22),
            this.secondaryMat
          );
          abPlate.position.set(0, -0.04 - i * 0.09, 0.02);
          chestGroup.add(abPlate);
        }

        // Spine reinforcement on back
        const spineRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.44, 0.05),
          this.carbonMat
        );
        spineRail.position.set(0, 0.1, -0.14);

        chestGroup.add(chestPlate, reactorRing, reactorCore, spineRail);
        break;
      }

      case 'tacticalVest': {
        // Military tactical harness with pouches
        const vest = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.4, 0.26),
          this.secondaryMat
        );
        vest.position.set(0, 0.12, 0);

        // Modular pouches on front
        const pouchGeo = new THREE.BoxGeometry(0.08, 0.1, 0.05);
        const p1 = new THREE.Mesh(pouchGeo, this.primaryMat);
        p1.position.set(0.12, 0.06, 0.14);

        const p2 = p1.clone();
        p2.position.set(-0.12, 0.06, 0.14);

        const p3 = p1.clone();
        p3.position.set(0, 0.06, 0.14);

        // Radio comms strap
        const strap = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.42, 0.02),
          this.accentMat
        );
        strap.position.set(-0.12, 0.12, 0.135);
        strap.rotation.z = -0.2;

        chestGroup.add(vest, p1, p2, p3, strap);
        break;
      }

      case 'sleekBodysuit':
      default: {
        // Streamlined nanotech athletic suit
        const suit = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.42, 0.24),
          this.primaryMat
        );
        suit.position.set(0, 0.12, 0);

        // Glowing streamline lines
        const vStripeL = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.4, 0.015),
          this.emissiveMat
        );
        vStripeL.position.set(0.1, 0.12, 0.125);
        vStripeL.rotation.z = -0.1;

        const vStripeR = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.4, 0.015),
          this.emissiveMat
        );
        vStripeR.position.set(-0.1, 0.12, 0.125);
        vStripeR.rotation.z = 0.1;

        chestGroup.add(suit, vStripeL, vStripeR);
        break;
      }
    }

    // Belt and buckle at base of spine
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16),
      this.secondaryMat
    );
    belt.position.set(0, -0.15, 0);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.09, 0.03),
      this.accentMat
    );
    buckle.position.set(0, -0.15, 0.23);

    chestGroup.add(belt, buckle);
    this.torsoNode.add(chestGroup);

    // Arm sleeves (on upper arm joints)
    this.buildArmSleeves();
  }

  private buildArmSleeves() {
    // Upper arms & Forearm gauntlets
    const upperArmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 12);
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.26, 12);

    const leftUpperArmMesh = new THREE.Mesh(upperArmGeo, this.primaryMat);
    leftUpperArmMesh.position.set(0, -0.14, 0);
    this.leftShoulderJoint.add(leftUpperArmMesh);

    const leftForearmMesh = new THREE.Mesh(forearmGeo, this.secondaryMat);
    leftForearmMesh.position.set(0, -0.13, 0);
    this.leftElbowJoint.add(leftForearmMesh);

    const rightUpperArmMesh = new THREE.Mesh(upperArmGeo, this.primaryMat);
    rightUpperArmMesh.position.set(0, -0.14, 0);
    this.rightShoulderJoint.add(rightUpperArmMesh);

    const rightForearmMesh = new THREE.Mesh(forearmGeo, this.secondaryMat);
    rightForearmMesh.position.set(0, -0.13, 0);
    this.rightElbowJoint.add(rightForearmMesh);

    // Gauntlet glowing display bracer on left forearm
    const bracer = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.12, 0.02),
      this.emissiveMat
    );
    bracer.position.set(0, -0.1, 0.07);
    this.leftElbowJoint.add(bracer);
  }

  // --- 3. SHOULDERS ---
  private buildShoulders() {
    if (this.config.shoulders === 'none') return;

    switch (this.config.shoulders) {
      case 'sleekGuards': {
        const guardGeo = new THREE.SphereGeometry(0.11, 12, 8);
        guardGeo.scale(1.1, 0.8, 1.2);

        const leftGuard = new THREE.Mesh(guardGeo, this.primaryMat);
        leftGuard.position.set(0.06, 0.02, 0);
        leftGuard.castShadow = true;
        this.leftShoulderJoint.add(leftGuard);

        const rightGuard = new THREE.Mesh(guardGeo, this.primaryMat);
        rightGuard.position.set(-0.06, 0.02, 0);
        rightGuard.castShadow = true;
        this.rightShoulderJoint.add(rightGuard);
        break;
      }

      case 'heavyPauldrons': {
        // Multi-layered heavy assault pauldrons
        const pauldronGeo = new THREE.BoxGeometry(0.2, 0.14, 0.22);

        const leftP = new THREE.Mesh(pauldronGeo, this.primaryMat);
        leftP.position.set(0.08, 0.04, 0);
        leftP.rotation.z = -0.3;

        const leftTrim = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.02, 0.24),
          this.emissiveMat
        );
        leftTrim.position.set(0.08, 0.11, 0);
        leftTrim.rotation.z = -0.3;

        this.leftShoulderJoint.add(leftP, leftTrim);

        const rightP = new THREE.Mesh(pauldronGeo, this.primaryMat);
        rightP.position.set(-0.08, 0.04, 0);
        rightP.rotation.z = 0.3;

        const rightTrim = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.02, 0.24),
          this.emissiveMat
        );
        rightTrim.position.set(-0.08, 0.11, 0);
        rightTrim.rotation.z = 0.3;

        this.rightShoulderJoint.add(rightP, rightTrim);
        break;
      }

      case 'floatGuards': {
        // Anti-grav floating energy shields
        const shieldGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 6);
        shieldGeo.rotateX(Math.PI * 0.5);

        const leftShield = new THREE.Mesh(shieldGeo, this.accentMat);
        leftShield.position.set(0.12, 0.08, 0);
        leftShield.rotation.z = -0.4;

        const leftCore = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 8, 8),
          this.emissiveMat
        );
        leftCore.position.set(0.12, 0.08, 0.02);

        this.leftShoulderJoint.add(leftShield, leftCore);

        const rightShield = new THREE.Mesh(shieldGeo, this.accentMat);
        rightShield.position.set(-0.12, 0.08, 0);
        rightShield.rotation.z = 0.4;

        const rightCore = leftCore.clone();
        rightCore.position.set(-0.12, 0.08, 0.02);

        this.rightShoulderJoint.add(rightShield, rightCore);
        break;
      }
    }
  }

  // --- 4. LEGS ---
  private buildLegs() {
    // Thighs and Shins attached to Hip and Knee joints
    const thighGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.42, 12);
    const shinGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.42, 12);

    const leftThighMesh = new THREE.Mesh(thighGeo, this.primaryMat);
    leftThighMesh.position.set(0, -0.21, 0);
    this.leftHipJoint.add(leftThighMesh);

    const rightThighMesh = new THREE.Mesh(thighGeo, this.primaryMat);
    rightThighMesh.position.set(0, -0.21, 0);
    this.rightHipJoint.add(rightThighMesh);

    const leftShinMesh = new THREE.Mesh(shinGeo, this.secondaryMat);
    leftShinMesh.position.set(0, -0.21, 0);
    this.leftKneeJoint.add(leftShinMesh);

    const rightShinMesh = new THREE.Mesh(shinGeo, this.secondaryMat);
    rightShinMesh.position.set(0, -0.21, 0);
    this.rightKneeJoint.add(rightShinMesh);

    // Knee cap plates
    const kneeCapGeo = new THREE.BoxGeometry(0.11, 0.1, 0.05);
    const leftKneeCap = new THREE.Mesh(kneeCapGeo, this.accentMat);
    leftKneeCap.position.set(0, 0, 0.08);
    this.leftKneeJoint.add(leftKneeCap);

    const rightKneeCap = leftKneeCap.clone();
    this.rightKneeJoint.add(rightKneeCap);

    // Style specifics
    switch (this.config.legs) {
      case 'cargoTech': {
        // Side cargo pouches & strap bands
        const pouchGeo = new THREE.BoxGeometry(0.06, 0.12, 0.1);
        const pL = new THREE.Mesh(pouchGeo, this.secondaryMat);
        pL.position.set(0.11, -0.18, 0);
        this.leftHipJoint.add(pL);

        const pR = new THREE.Mesh(pouchGeo, this.secondaryMat);
        pR.position.set(-0.11, -0.18, 0);
        this.rightHipJoint.add(pR);
        break;
      }

      case 'armoredGreaves': {
        // Reinforced shin shield plates with neon glow lines
        const plateGeo = new THREE.BoxGeometry(0.12, 0.32, 0.04);
        const greaveL = new THREE.Mesh(plateGeo, this.accentMat);
        greaveL.position.set(0, -0.2, 0.08);

        const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.015), this.emissiveMat);
        trimL.position.set(0, -0.2, 0.105);

        this.leftKneeJoint.add(greaveL, trimL);

        const greaveR = greaveL.clone();
        const trimR = trimL.clone();
        this.rightKneeJoint.add(greaveR, trimR);
        break;
      }

      case 'cyberLeggings': {
        // Glowing side seam stripes
        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 0.015), this.emissiveMat);
        stripeL.position.set(0.11, -0.21, 0);
        this.leftHipJoint.add(stripeL);

        const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 0.015), this.emissiveMat);
        stripeR.position.set(-0.11, -0.21, 0);
        this.rightHipJoint.add(stripeR);
        break;
      }

      default:
        break;
    }
  }

  // --- 5. FOOTWEAR ---
  private buildFootwear() {
    // Build both left and right shoes onto leftFootJoint and rightFootJoint
    const createShoe = (isLeft: boolean) => {
      const shoeGroup = new THREE.Group();

      switch (this.config.footwear) {
        case 'hiTopRunners': {
          // Futuristic street runner kicks
          const sole = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.05, 0.26),
            this.emissiveMat
          );
          sole.position.set(0, -0.05, 0.04);

          const upper = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.1, 0.22),
            this.primaryMat
          );
          upper.position.set(0, 0, 0.03);

          const toe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.11, 12),
            this.secondaryMat
          );
          toe.rotation.z = Math.PI * 0.5;
          toe.position.set(0, -0.01, 0.12);

          shoeGroup.add(sole, upper, toe);
          break;
        }

        case 'heavyExoBoots': {
          // Heavy armored industrial boots with piston heel
          const boot = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.28),
            this.secondaryMat
          );
          boot.position.set(0, -0.02, 0.04);

          const steelToe = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.08, 0.08),
            this.accentMat
          );
          steelToe.position.set(0, -0.05, 0.16);

          const piston = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8),
            this.emissiveMat
          );
          piston.position.set(0, -0.03, -0.08);

          shoeGroup.add(boot, steelToe, piston);
          break;
        }

        case 'magneticKicks': {
          // Aerodynamic hover kicks
          const kick = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.08, 0.24),
            this.primaryMat
          );
          kick.position.set(0, -0.02, 0.03);

          const thrusterPad = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.02, 0.22),
            this.emissiveMat
          );
          thrusterPad.position.set(0, -0.07, 0.03);

          shoeGroup.add(kick, thrusterPad);
          break;
        }

        case 'stealthFlats':
        default: {
          const flat = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.06, 0.23),
            this.carbonMat
          );
          flat.position.set(0, -0.04, 0.03);
          shoeGroup.add(flat);
          break;
        }
      }

      return shoeGroup;
    };

    const leftShoe = createShoe(true);
    this.leftFootJoint.add(leftShoe);

    const rightShoe = createShoe(false);
    this.rightFootJoint.add(rightShoe);
  }

  // --- 6. BACK GEAR ---
  private buildBackGear() {
    if (this.config.backGear === 'none') return;

    switch (this.config.backGear) {
      case 'dualBlades': {
        // High-frequency crossed katanas with glowing hilts
        const sheathGeo = new THREE.BoxGeometry(0.05, 0.85, 0.04);
        const bladeL = new THREE.Mesh(sheathGeo, this.carbonMat);
        bladeL.position.set(0.08, 0.22, -0.18);
        bladeL.rotation.z = -0.4;
        bladeL.rotation.x = -0.1;

        const hiltL = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8),
          this.emissiveMat
        );
        hiltL.position.set(0.24, 0.65, -0.18);
        hiltL.rotation.z = -0.4;

        const bladeR = new THREE.Mesh(sheathGeo, this.carbonMat);
        bladeR.position.set(-0.08, 0.22, -0.18);
        bladeR.rotation.z = 0.4;
        bladeR.rotation.x = -0.1;

        const hiltR = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8),
          this.emissiveMat
        );
        hiltR.position.set(-0.24, 0.65, -0.18);
        hiltR.rotation.z = 0.4;

        this.backGearNode.add(bladeL, hiltL, bladeR, hiltR);
        break;
      }

      case 'jetpackThrusters': {
        // Twin aerodynamic thruster engines
        const packBase = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.28, 0.1),
          this.secondaryMat
        );
        packBase.position.set(0, 0.16, -0.18);

        const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.36, 12);
        const tLeft = new THREE.Mesh(thrusterGeo, this.primaryMat);
        tLeft.position.set(0.12, 0.14, -0.22);

        const tRight = new THREE.Mesh(thrusterGeo, this.primaryMat);
        tRight.position.set(-0.12, 0.14, -0.22);

        // Exhaust nozzles glowing with thruster fire
        const nozzleGeo = new THREE.ConeGeometry(0.065, 0.1, 12);
        nozzleGeo.rotateX(Math.PI);
        const nozL = new THREE.Mesh(nozzleGeo, this.emissiveMat);
        nozL.position.set(0.12, -0.07, -0.22);

        const nozR = new THREE.Mesh(nozzleGeo, this.emissiveMat);
        nozR.position.set(-0.12, -0.07, -0.22);

        this.backGearNode.add(packBase, tLeft, tRight, nozL, nozR);
        break;
      }

      case 'cyberCape': {
        // Multi-segmented hardlight cyber cape
        const capeGroup = new THREE.Group();
        for (let i = 0; i < 5; i++) {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.36 - i * 0.02, 0.15, 0.02),
            i % 2 === 0 ? this.primaryMat : this.emissiveMat
          );
          panel.position.set(0, 0.18 - i * 0.14, -0.18 - i * 0.03);
          panel.rotation.x = 0.1 + i * 0.05;
          capeGroup.add(panel);
        }
        this.backGearNode.add(capeGroup);
        break;
      }

      case 'orbitalRing': {
        // Gyroscopic floating celestial ring
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.38, 0.02, 8, 32),
          this.emissiveMat
        );
        ring.position.set(0, 0.16, -0.22);
        this.backGearNode.add(ring);
        break;
      }
    }
  }

  // --- PROCEDURAL ANIMATION ENGINE ---
  public setAction(newAction: AnimationAction) {
    if (this.action === newAction) return;
    this.action = newAction;
    // Sound cue on transition
    if (newAction === 'jump') {
      sounds.playJump();
    } else if (newAction === 'strike') {
      sounds.playStrike();
    } else if (newAction === 'victory') {
      sounds.playOutfitSwitch();
    }
  }

  public getAction(): AnimationAction {
    return this.action;
  }

  // Per-frame tick with exponential damping for ultra-smooth movement
  public update(delta: number, speedMultiplier: number = 1.0) {
    const dt = Math.min(delta, 0.1);
    const speed = speedMultiplier;
    this.animTime += dt * speed;
    const t = this.animTime;

    // Reset baseline joint targets
    let pelvisY = 0.98;
    let pelvisPitch = 0;
    let pelvisYaw = 0;
    let pelvisRoll = 0;

    let spinePitch = 0;
    let spineYaw = 0;
    let spineRoll = 0;

    let chestPitch = 0;
    let chestYaw = 0;
    let chestRoll = 0;

    let headPitch = 0;
    let headYaw = 0;
    let headRoll = 0;

    let lShoulderPitch = 0;
    let lShoulderRoll = 0.15;
    let lElbowPitch = -0.2;

    let rShoulderPitch = 0;
    let rShoulderRoll = -0.15;
    let rElbowPitch = -0.2;

    let lHipPitch = 0;
    let lHipRoll = 0;
    let lKneePitch = 0.05;
    let lFootPitch = 0;

    let rHipPitch = 0;
    let rHipRoll = 0;
    let rKneePitch = 0.05;
    let rFootPitch = 0;

    // Animation computation
    switch (this.action) {
      case 'idle': {
        // Natural relaxed breathing & subtle balance sway
        const breath = Math.sin(t * 2.2);
        chestPitch = breath * 0.04;
        spinePitch = breath * 0.02;
        headPitch = -breath * 0.03;

        // Subtle side-to-side weight transfer
        const sway = Math.sin(t * 1.1);
        pelvisRoll = sway * 0.02;
        spineRoll = -sway * 0.015;
        pelvisY = 0.98 + Math.cos(t * 2.2) * 0.01;

        // Relaxed arms swaying gently
        lShoulderPitch = Math.sin(t * 1.1) * 0.04;
        lShoulderRoll = 0.15 + breath * 0.02;
        lElbowPitch = -0.25 + breath * 0.03;

        rShoulderPitch = -Math.sin(t * 1.1) * 0.04;
        rShoulderRoll = -0.15 - breath * 0.02;
        rElbowPitch = -0.25 + breath * 0.03;
        break;
      }

      case 'walk': {
        const strideFreq = 4.2;
        const phase = t * strideFreq;
        const stepCycle = Math.sin(phase);
        const cosStep = Math.cos(phase);

        // Pelvic bob (drops twice per stride)
        pelvisY = 0.96 + Math.abs(cosStep) * 0.05;
        pelvisPitch = 0.08;
        pelvisYaw = -stepCycle * 0.12;

        // Counter-rotating chest & spine
        chestYaw = stepCycle * 0.15;
        headYaw = -stepCycle * 0.05;

        // Legs stride
        lHipPitch = stepCycle * 0.55;
        rHipPitch = -stepCycle * 0.55;

        // Knees bend on backward sweep & forward lift
        lKneePitch = Math.max(0.05, -stepCycle * 0.85);
        rKneePitch = Math.max(0.05, stepCycle * 0.85);

        // Feet orientation
        lFootPitch = -stepCycle * 0.2;
        rFootPitch = stepCycle * 0.2;

        // Arm counter-swing
        lShoulderPitch = -stepCycle * 0.5;
        rShoulderPitch = stepCycle * 0.5;
        lElbowPitch = -0.3 - Math.abs(stepCycle) * 0.2;
        rElbowPitch = -0.3 - Math.abs(stepCycle) * 0.2;

        // Footstep audio cues
        if (cosStep > 0.95 && t - this.lastFootstepTime > 0.25) {
          sounds.playFootstep(false);
          this.lastFootstepTime = t;
        }
        break;
      }

      case 'run':
      case 'sprint': {
        const isSprint = this.action === 'sprint';
        const strideFreq = isSprint ? 7.8 : 6.4;
        const phase = t * strideFreq;
        const stepCycle = Math.sin(phase);
        const cosStep = Math.cos(phase);

        // Low forward aerodynamic lean
        pelvisPitch = isSprint ? 0.32 : 0.22;
        pelvisY = 0.93 + Math.abs(cosStep) * 0.08;
        pelvisYaw = -stepCycle * 0.18;

        chestYaw = stepCycle * 0.22;
        chestPitch = 0.08;
        headPitch = isSprint ? -0.28 : -0.18;

        // High knee drives
        const legAmp = isSprint ? 0.95 : 0.78;
        lHipPitch = stepCycle * legAmp;
        rHipPitch = -stepCycle * legAmp;

        lKneePitch = Math.max(0.1, -stepCycle * (isSprint ? 1.4 : 1.15));
        rKneePitch = Math.max(0.1, stepCycle * (isSprint ? 1.4 : 1.15));

        // Pumping arms
        const armAmp = isSprint ? 1.1 : 0.85;
        lShoulderPitch = -stepCycle * armAmp;
        rShoulderPitch = stepCycle * armAmp;
        lElbowPitch = -0.7 - Math.abs(stepCycle) * 0.4;
        rElbowPitch = -0.7 - Math.abs(stepCycle) * 0.4;

        if (cosStep > 0.9 && t - this.lastFootstepTime > 0.18) {
          sounds.playFootstep(true);
          this.lastFootstepTime = t;
        }
        break;
      }

      case 'dance': {
        // Groovy rhythmic bounce and arm wave
        const beat = t * 5.0;
        const sinB = Math.sin(beat);
        const cosB = Math.cos(beat * 0.5);

        pelvisY = 0.92 + Math.abs(Math.sin(beat)) * 0.08;
        pelvisRoll = cosB * 0.22;
        pelvisYaw = Math.sin(beat * 0.5) * 0.25;

        spineRoll = -cosB * 0.15;
        chestPitch = -sinB * 0.08;
        headRoll = cosB * 0.2;
        headPitch = sinB * 0.1;

        // Expressive arm dance
        lShoulderPitch = Math.sin(beat * 0.5) * 0.6;
        lShoulderRoll = 0.6 + Math.cos(beat) * 0.3;
        lElbowPitch = -0.8 + Math.sin(beat) * 0.5;

        rShoulderPitch = -Math.sin(beat * 0.5) * 0.6;
        rShoulderRoll = -0.6 - Math.cos(beat) * 0.3;
        rElbowPitch = -0.8 - Math.sin(beat) * 0.5;

        lHipPitch = Math.sin(beat * 0.5) * 0.2;
        rHipPitch = -Math.sin(beat * 0.5) * 0.2;
        lKneePitch = 0.2 + Math.abs(sinB) * 0.3;
        rKneePitch = 0.2 + Math.abs(cosB) * 0.3;
        break;
      }

      case 'jump': {
        // Loopable acrobatic jump cycle (squat -> launch -> tuck -> land)
        const cycle = (t * 2.2) % (Math.PI * 2);
        if (cycle < Math.PI * 0.3) {
          // Crouch windup
          const p = cycle / (Math.PI * 0.3);
          pelvisY = 0.98 - p * 0.25;
          pelvisPitch = 0.25;
          lKneePitch = 0.8;
          rKneePitch = 0.8;
          lShoulderPitch = 0.4;
          rShoulderPitch = 0.4;
        } else if (cycle < Math.PI * 1.2) {
          // Aerial leap & apex
          const airPhase = (cycle - Math.PI * 0.3) / (Math.PI * 0.9);
          pelvisY = 0.85 + Math.sin(airPhase * Math.PI) * 0.55;
          pelvisPitch = -0.15;
          lKneePitch = 0.6 * (1 - airPhase);
          rKneePitch = 0.9 * (1 - airPhase);
          lShoulderPitch = -1.2;
          rShoulderPitch = -1.2;
        } else {
          // Landing recovery
          const landPhase = (cycle - Math.PI * 1.2) / (Math.PI * 0.8);
          pelvisY = 0.98 - Math.sin(landPhase * Math.PI) * 0.15;
          lKneePitch = Math.sin(landPhase * Math.PI) * 0.4 + 0.05;
          rKneePitch = Math.sin(landPhase * Math.PI) * 0.4 + 0.05;
        }
        break;
      }

      case 'strike': {
        // Martial arts punch & spin-kick combo cycle
        const comboTime = (t * 3.0) % 6.0;
        if (comboTime < 2.5) {
          // Heavy right straight punch
          const p = comboTime / 2.5;
          const punch = Math.sin(p * Math.PI);
          chestYaw = -punch * 0.65;
          pelvisPitch = punch * 0.15;

          rShoulderPitch = -punch * 1.4;
          rShoulderRoll = -0.1;
          rElbowPitch = -(1 - punch) * 0.8;

          lShoulderPitch = 0.2;
          lShoulderRoll = 0.4;
          lElbowPitch = -1.2; // guard pose
        } else {
          // Spinning hook kick
          const kPhase = (comboTime - 2.5) / 3.5;
          const kick = Math.sin(kPhase * Math.PI);
          pelvisYaw = kick * 1.2;
          pelvisPitch = -kick * 0.25;

          lHipPitch = kick * 1.3;
          lKneePitch = (1 - kick) * 0.8;

          lShoulderRoll = 0.7;
          rShoulderRoll = -0.7;
        }
        break;
      }

      case 'wave': {
        // Friendly high wave emote
        headPitch = -0.05;
        headRoll = -0.1;

        // Right arm raised high, hand waving
        rShoulderPitch = -1.3;
        rShoulderRoll = -0.7;
        rElbowPitch = -1.1 + Math.sin(t * 6.5) * 0.35;
        this.rightHandJoint.rotation.z = Math.sin(t * 6.5) * 0.4;

        // Left arm relaxed at hip
        lShoulderRoll = 0.2;
        lElbowPitch = -0.3;
        break;
      }

      case 'victory': {
        // Double fist victory power pose
        const pump = Math.sin(t * 3.5);
        pelvisPitch = -0.1;
        chestPitch = -0.18;
        headPitch = -0.25;

        lShoulderPitch = -1.4 + pump * 0.15;
        lShoulderRoll = 0.6;
        lElbowPitch = -1.3;

        rShoulderPitch = -1.4 + pump * 0.15;
        rShoulderRoll = -0.6;
        rElbowPitch = -1.3;

        lHipRoll = 0.15;
        rHipRoll = -0.15;
        break;
      }
    }

    // Smooth exponential damping interpolation onto actual joints
    const dampSpeed = 16;
    this.pelvisJoint.position.y = THREE.MathUtils.damp(this.pelvisJoint.position.y, pelvisY, dampSpeed, dt);
    this.pelvisJoint.rotation.x = THREE.MathUtils.damp(this.pelvisJoint.rotation.x, pelvisPitch, dampSpeed, dt);
    this.pelvisJoint.rotation.y = THREE.MathUtils.damp(this.pelvisJoint.rotation.y, pelvisYaw, dampSpeed, dt);
    this.pelvisJoint.rotation.z = THREE.MathUtils.damp(this.pelvisJoint.rotation.z, pelvisRoll, dampSpeed, dt);

    this.spineJoint.rotation.x = THREE.MathUtils.damp(this.spineJoint.rotation.x, spinePitch, dampSpeed, dt);
    this.spineJoint.rotation.y = THREE.MathUtils.damp(this.spineJoint.rotation.y, spineYaw, dampSpeed, dt);
    this.spineJoint.rotation.z = THREE.MathUtils.damp(this.spineJoint.rotation.z, spineRoll, dampSpeed, dt);

    this.chestJoint.rotation.x = THREE.MathUtils.damp(this.chestJoint.rotation.x, chestPitch, dampSpeed, dt);
    this.chestJoint.rotation.y = THREE.MathUtils.damp(this.chestJoint.rotation.y, chestYaw, dampSpeed, dt);
    this.chestJoint.rotation.z = THREE.MathUtils.damp(this.chestJoint.rotation.z, chestRoll, dampSpeed, dt);

    this.headJoint.rotation.x = THREE.MathUtils.damp(this.headJoint.rotation.x, headPitch, dampSpeed, dt);
    this.headJoint.rotation.y = THREE.MathUtils.damp(this.headJoint.rotation.y, headYaw, dampSpeed, dt);
    this.headJoint.rotation.z = THREE.MathUtils.damp(this.headJoint.rotation.z, headRoll, dampSpeed, dt);

    // Arms
    this.leftShoulderJoint.rotation.x = THREE.MathUtils.damp(this.leftShoulderJoint.rotation.x, lShoulderPitch, dampSpeed, dt);
    this.leftShoulderJoint.rotation.z = THREE.MathUtils.damp(this.leftShoulderJoint.rotation.z, lShoulderRoll, dampSpeed, dt);
    this.leftElbowJoint.rotation.x = THREE.MathUtils.damp(this.leftElbowJoint.rotation.x, lElbowPitch, dampSpeed, dt);

    this.rightShoulderJoint.rotation.x = THREE.MathUtils.damp(this.rightShoulderJoint.rotation.x, rShoulderPitch, dampSpeed, dt);
    this.rightShoulderJoint.rotation.z = THREE.MathUtils.damp(this.rightShoulderJoint.rotation.z, rShoulderRoll, dampSpeed, dt);
    this.rightElbowJoint.rotation.x = THREE.MathUtils.damp(this.rightElbowJoint.rotation.x, rElbowPitch, dampSpeed, dt);

    // Legs
    this.leftHipJoint.rotation.x = THREE.MathUtils.damp(this.leftHipJoint.rotation.x, lHipPitch, dampSpeed, dt);
    this.leftHipJoint.rotation.z = THREE.MathUtils.damp(this.leftHipJoint.rotation.z, lHipRoll, dampSpeed, dt);
    this.leftKneeJoint.rotation.x = THREE.MathUtils.damp(this.leftKneeJoint.rotation.x, lKneePitch, dampSpeed, dt);
    this.leftFootJoint.rotation.x = THREE.MathUtils.damp(this.leftFootJoint.rotation.x, lFootPitch, dampSpeed, dt);

    this.rightHipJoint.rotation.x = THREE.MathUtils.damp(this.rightHipJoint.rotation.x, rHipPitch, dampSpeed, dt);
    this.rightHipJoint.rotation.z = THREE.MathUtils.damp(this.rightHipJoint.rotation.z, rHipRoll, dampSpeed, dt);
    this.rightKneeJoint.rotation.x = THREE.MathUtils.damp(this.rightKneeJoint.rotation.x, rKneePitch, dampSpeed, dt);
    this.rightFootJoint.rotation.x = THREE.MathUtils.damp(this.rightFootJoint.rotation.x, rFootPitch, dampSpeed, dt);

    // Update foot contact shadow positions based on world feet position
    this.leftFootJoint.getWorldPosition(_vec3);
    this.footContactShadowLeft.position.set(_vec3.x - this.group.position.x, 0.015, _vec3.z - this.group.position.z);
    this.rightFootJoint.getWorldPosition(_vec3);
    this.footContactShadowRight.position.set(_vec3.x - this.group.position.x, 0.015, _vec3.z - this.group.position.z);
  }

  public dispose() {
    this.carbonTexture.dispose();
    this.hexTexture.dispose();
    this.primaryMat.dispose();
    this.secondaryMat.dispose();
    this.accentMat.dispose();
    this.emissiveMat.dispose();
    this.skinMat.dispose();
    this.hairMat.dispose();
    this.carbonMat.dispose();
    this.visorMat.dispose();
  }
}
