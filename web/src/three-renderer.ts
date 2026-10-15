import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface ThreePetFrame {
  behavior: string;
  progress: number;
  time: number;
  facing: number;
  ballColor: string;
  reducedMotion: boolean;
}

type LegRig = {
  group: THREE.Group;
  lower: THREE.Group;
  paw: THREE.Mesh;
};

function createBaseFurTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#d69345";
    ctx.fillRect(0, 0, 256, 256);

    const colors = ["#eeb462", "#f6dba1", "#a4622b", "#d69345"];
    for (let i = 0; i < 30000; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const len = 2 + Math.random() * 6;
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.2;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.lineWidth = 0.5 + Math.random() * 1.0;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createFurNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = "white";
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = 0.5 + Math.random() * 1.5;
      ctx.fillRect(x, y, size, size);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

function smoothDamp(current: number, target: number, speed: number, dt: number): number {
  return target + (current - target) * Math.exp(-speed * dt);
}

export class ThreePetRenderer {
  private readonly baseFur = createBaseFurTexture();
  private readonly furNoise = createFurNoiseTexture();
  private readonly gltfBones = new Map<string, THREE.Bone>();
  private readonly initialBoneRotations = new Map<string, THREE.Euler>();
  private readonly initialBonePositions = new Map<string, THREE.Vector3>();
  private dogMesh: THREE.SkinnedMesh | null = null;
  private currentModelRotationY = -0.94;
  private currentRootPosY = 0;
  private currentRootPosZ = 0;
  private currentSpine1Pitch = 0;
  private currentSpine2Pitch = 0;
  private currentSpineTopPitch = 0;
  private currentSpineYaw = 0;
  private currentNeck1Pitch = 0;
  private currentNeckTopPitch = 0;
  private currentNeckTopYaw = 0;
  private currentJawOpen = 0;
  private currentLeftFrontHip = 0;
  private currentLeftFrontKnee = 0;
  private currentLeftFrontAnkle = 0;
  private currentRightFrontHip = 0;
  private currentRightFrontKnee = 0;
  private currentRightFrontAnkle = 0;
  private currentLeftHindHip = 0;
  private currentLeftHindKnee = 0;
  private currentLeftHindAnkle = 0;
  private currentRightHindHip = 0;
  private currentRightHindKnee = 0;
  private currentRightHindAnkle = 0;
  private currentLeftEarX = 0;
  private currentRightEarX = 0;
  private currentLeftEarZ = 0;
  private currentRightEarZ = 0;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-2.3, 2.3, 1.82, -1.72, 0.1, 30);
  private readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly muzzle = new THREE.Group();
  private readonly tongue: THREE.Mesh;
  private readonly tail = new THREE.Group();
  private readonly tailJoints: THREE.Group[] = [];
  private readonly hairBatches = new Map<
    THREE.Object3D,
    Map<THREE.Material, { positions: number[]; hairProgress: number[]; phase: number; movement: number }>
  >();
  private readonly furPatches: Array<{
    group: THREE.Group;
    phase: number;
    amount: number;
    material: THREE.LineBasicMaterial;
  }> = [];
  private readonly ears: [THREE.Mesh, THREE.Mesh];
  private readonly legs: [LegRig, LegRig, LegRig, LegRig];
  private readonly eyelids: THREE.Mesh[] = [];
  private gltfModel: THREE.Group | null = null;
  private isModelLoaded = false;
  private lastTime = 0;
  private blinkTimer = 0;
  private nextBlinkTime = 3.5;
  private earVelocity: [number, number] = [0, 0];
  private leftEarSway = -0.15;
  private rightEarSway = 0.15;
  private readonly balls: THREE.Mesh[] = [];
  private readonly fetchBall: THREE.Mesh;
  private readonly foodBowl = new THREE.Group();
  private readonly treat: THREE.Mesh;
  private readonly golden = new THREE.MeshPhysicalMaterial({
    color: 0xd69345,
    roughness: 0.84,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.007,
    sheen: 0.88,
    sheenColor: 0xffdfaa,
    sheenRoughness: 0.38,
  });
  private readonly lightGolden = new THREE.MeshPhysicalMaterial({
    color: 0xeeb462,
    roughness: 0.84,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.007,
    sheen: 0.88,
    sheenColor: 0xffe9c2,
    sheenRoughness: 0.38,
  });
  private readonly cream = new THREE.MeshPhysicalMaterial({
    color: 0xf6dba1,
    roughness: 0.88,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.005,
    sheen: 0.75,
    sheenColor: 0xfff4db,
    sheenRoughness: 0.42,
  });
  private readonly darkGolden = new THREE.MeshPhysicalMaterial({
    color: 0xa4622b,
    roughness: 0.84,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.009,
    sheen: 0.9,
    sheenColor: 0xdc9258,
    sheenRoughness: 0.36,
  });
  private readonly black = new THREE.MeshPhysicalMaterial({
    color: 0x11100f,
    roughness: 0.32,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
  });
  private readonly wetNose = new THREE.MeshPhysicalMaterial({
    color: 0x14110f,
    roughness: 0.24,
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  private readonly corneaMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.02,
    metalness: 0,
    transmission: 0.94,
    ior: 1.336,
    transparent: true,
    opacity: 1,
    reflectivity: 0.9,
  });
  private readonly irisMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2a12,
    roughness: 0.42,
    metalness: 0.02,
  });

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(220, 180, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera.position.set(5.4, 3.2, 7.4);
    this.camera.lookAt(0.1, 1.05, 0);

    const hemisphere = new THREE.HemisphereLight(0xfff6eb, 0x6e4e32, 2.4);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfffaef, 3.6);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -2;
    this.scene.add(key);

    // Dedicated Eye & Face light for crisp catchlights, dark pupils, and wet nose
    const faceLight = new THREE.DirectionalLight(0xffffff, 2.4);
    faceLight.position.set(5.4, 3.8, 7.4);
    this.scene.add(faceLight);

    const rim = new THREE.DirectionalLight(0xffd8b0, 1.8);
    rim.position.set(-4, 3, -4);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.3),
      new THREE.ShadowMaterial({ color: 0x4a2d1b, opacity: 0.22 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.scene.add(this.root);
    this.root.add(this.body);

    this.buildBody();
    this.legs = [
      this.buildLeg(new THREE.Vector3(0.72, 0.66, 0.42)),
      this.buildLeg(new THREE.Vector3(0.72, 0.66, -0.42)),
      this.buildLeg(new THREE.Vector3(-0.72, 0.66, 0.42)),
      this.buildLeg(new THREE.Vector3(-0.72, 0.66, -0.42)),
    ];
    this.ears = this.buildHead();
    this.buildTail();
    this.tongue = this.buildMouth();
    this.fetchBall = this.buildBalls();
    this.treat = this.buildCareProps();
    this.scene.add(this.fetchBall);
    this.scene.add(this.foodBowl);
    this.scene.add(this.treat);
  }

  render(frame: ThreePetFrame): void {
    this.resetPose();

    const dt = this.lastTime === 0 ? 0.016 : Math.min(0.1, frame.time - this.lastTime);
    this.lastTime = frame.time;

    if (this.isModelLoaded && this.gltfModel) {
      this.updateCanineKinematics(frame, dt);

      // Precise canine headings in camera view
      // Head points along +Z in model space
      const walkAngle = frame.facing > 0 ? 2.19 : -0.95;
      // Front 3/4 beauty view: canine body angled, but face and both eyes looking warmly towards camera
      const beautyAngle = frame.facing > 0 ? 0.78 : 0.46;
      // Direct front-on contact angle for intimate tricks
      const directAngle = 0.62;

      let targetRotY = beautyAngle;
      let targetRotZ = 0;
      let targetPosY = 0;

      if (["walking", "running", "chasing"].includes(frame.behavior)) {
        targetRotY = walkAngle;
        const gaitFreq = frame.behavior === "walking" ? 6.2 : 11.5;
        targetPosY = Math.abs(Math.sin(frame.time * gaitFreq)) * 0.02;
      } else if (frame.behavior === "fetch") {
        if (frame.progress < 0.6) {
          targetRotY = -0.95; // chase ball to left
          targetPosY = Math.abs(Math.sin(frame.time * 11.5)) * 0.02;
        } else {
          targetRotY = beautyAngle; // trot back with ball
        }
      } else if (["namaste", "speak", "ask-food", "handshake", "hi-five", "salute"].includes(frame.behavior)) {
        targetRotY = directAngle;
      } else if (["sit", "idle", "feed", "treat"].includes(frame.behavior)) {
        targetRotY = beautyAngle;
      } else if (["down", "sleeping"].includes(frame.behavior)) {
        targetRotY = beautyAngle;
      } else if (frame.behavior === "surprise") {
        const baseAngle = walkAngle;
        const spinProgress = frame.progress;
        this.currentModelRotationY = baseAngle + spinProgress * Math.PI * 2;
        this.gltfModel.rotation.y = this.currentModelRotationY;
        this.gltfModel.rotation.x = 0;
        this.gltfModel.rotation.z = 0;
        this.gltfModel.position.y = 0;
        if (spinProgress >= 1.0) {
          this.currentModelRotationY = baseAngle;
        }
      } else if (frame.behavior === "roll-over") {
        targetRotY = beautyAngle;
        const p = frame.progress;
        if (p < 0.20) {
          targetPosY = -0.38 * (p / 0.20);
          targetRotZ = 0;
        } else if (p < 0.80) {
          const rollPhase = (p - 0.20) / 0.60;
          targetPosY = -0.38 + Math.sin(rollPhase * Math.PI) * 0.08;
          targetRotZ = rollPhase * Math.PI * 2; // Natural roll along body Z-axis!
        } else {
          targetPosY = -0.38 * (1 - (p - 0.80) / 0.20);
          targetRotZ = 0;
        }
      } else if (frame.behavior === "jump") {
        targetRotY = beautyAngle;
        const p = frame.progress;
        if (p < 0.20) {
          targetPosY = -0.15 * (p / 0.20);
        } else if (p < 0.80) {
          const jumpPhase = (p - 0.20) / 0.60;
          targetPosY = Math.sin(jumpPhase * Math.PI) * 0.72;
        } else {
          targetPosY = -0.15 * (1 - (p - 0.80) / 0.20);
        }
      }

      if (frame.behavior !== "surprise") {
        this.currentModelRotationY = smoothDamp(this.currentModelRotationY, targetRotY, 8.5, dt);
        this.gltfModel.rotation.y = this.currentModelRotationY;
        this.gltfModel.rotation.x = 0;
        this.gltfModel.rotation.z = smoothDamp(this.gltfModel.rotation.z, targetRotZ, 10.0, dt);
        this.gltfModel.position.y = smoothDamp(this.gltfModel.position.y, targetPosY, 12.0, dt);
      }

      this.balls.forEach((ball) => {
        ball.visible = ["idle", "sleeping", "sit"].includes(frame.behavior);
      });
      if (frame.behavior === "fetch") {
        this.fetchBall.visible = true;
        (this.fetchBall.material as THREE.MeshStandardMaterial).color.set(frame.ballColor);
        if (frame.progress < 0.6) {
          const flight = frame.progress / 0.6;
          this.fetchBall.position.set(-2.2 + flight * 2.55, 0.25 + Math.sin(flight * Math.PI) * 1.5, 0.6 + flight * 0.65);
        } else {
          this.fetchBall.position.set(0.35, 1.30, 1.25);
        }
      } else {
        this.fetchBall.visible = false;
      }
      if (frame.behavior === "feed") {
        this.foodBowl.visible = true;
        this.foodBowl.position.set(0.35, 0.05, 1.15);
      } else {
        this.foodBowl.visible = false;
      }
      if (frame.behavior === "treat") {
        this.treat.visible = true;
        this.treat.position.set(0.35, 1.35, 1.25);
      } else {
        this.treat.visible = false;
      }

      this.renderer.render(this.scene, this.camera);
      return;
    }

    const gaitSpeed =
      frame.behavior === "walking"
        ? 7
        : ["running", "chasing"].includes(frame.behavior)
          ? 12
          : frame.behavior === "fetch"
            ? 10
            : 0;
    const gait = frame.reducedMotion ? 0 : Math.sin(frame.time * gaitSpeed);
    const bounce = frame.reducedMotion
      ? 0
      : gaitSpeed > 0
        ? Math.abs(Math.sin(frame.time * gaitSpeed)) * 0.1
        : Math.sin(frame.time * 2) * 0.018;

    const sideFacing = ((1 - frame.facing) / 2) * Math.PI;
    const facesViewer = ["idle", "sit", "handshake", "hi-five", "salute", "namaste", "speak", "feed", "treat", "ask-food"].includes(
      frame.behavior,
    );
    this.root.rotation.y = facesViewer ? -0.94 : sideFacing;
    this.root.position.y = bounce;
    this.body.rotation.z = gaitSpeed > 8 ? -0.055 : Math.sin(frame.time * 4) * 0.008;
    this.animateGait(gait, gaitSpeed > 8 ? 0.62 : 0.38);
    const excited = ["fetch", "treat", "feed", "surprise", "running", "chasing"].includes(frame.behavior);
    const relaxed = ["sleeping", "down"].includes(frame.behavior);
    const tailSpeed = excited ? 15 : relaxed ? 1.6 : 6.5;
    const sideAmplitude = relaxed ? 0.12 : excited ? 0.58 : 0.4;
    const verticalAmplitude = relaxed ? 0.04 : excited ? 0.2 : 0.08;
    const circular = ["treat", "feed", "surprise", "fetch"].includes(frame.behavior);
    const tailWave = frame.time * tailSpeed;

    this.tail.rotation.y = Math.sin(tailWave) * sideAmplitude;
    this.tail.rotation.z =
      -0.16 +
      (circular ? Math.cos(tailWave) * verticalAmplitude : Math.sin(tailWave * 0.47) * verticalAmplitude);
    this.tailJoints.forEach((joint, index) => {
      const phase = tailWave - index * 0.62;
      const taper = 0.94 - index * 0.1;
      joint.rotation.y = Math.sin(phase) * sideAmplitude * taper;
      joint.rotation.z =
        (circular ? Math.cos(phase) : Math.sin(phase * 0.43)) * verticalAmplitude * taper;
      joint.rotation.x = Math.sin(phase * 0.31) * (excited ? 0.1 : 0.035);
    });
    this.furPatches.forEach(({ material, phase }) => {
      if (material.userData.shader) {
        material.userData.shader.uniforms.uTime.value = frame.time + phase * 0.2;
        material.userData.shader.uniforms.uGait.value = gaitSpeed > 0 ? Math.abs(gait) : 0;
      }
    });

    let targetLeft = -0.15;
    let targetRight = 0.15;
    if (frame.behavior === "ask-food") {
      targetLeft = -0.05 + Math.sin(frame.time * 5) * 0.05;
      targetRight = 0.05 - Math.sin(frame.time * 5) * 0.05;
    } else if (gaitSpeed > 0) {
      const earFlop = Math.sin(frame.time * gaitSpeed - 1.2) * 0.16;
      targetLeft = -0.15 + earFlop;
      targetRight = 0.15 - earFlop;
    }

    const springK = 22.0;
    const damping = 4.2;
    const leftAcc = (targetLeft - this.leftEarSway) * springK - this.earVelocity[0] * damping;
    this.earVelocity[0] += leftAcc * dt;
    this.leftEarSway += this.earVelocity[0] * dt;

    const rightAcc = (targetRight - this.rightEarSway) * springK - this.earVelocity[1] * damping;
    this.earVelocity[1] += rightAcc * dt;
    this.rightEarSway += this.earVelocity[1] * dt;

    this.ears[0].rotation.x = this.leftEarSway;
    this.ears[1].rotation.x = this.rightEarSway;

    this.ears[0].rotation.z = Math.sin(frame.time * 1.8) * 0.03 + (gaitSpeed > 0 ? Math.sin(frame.time * gaitSpeed) * 0.08 : 0);
    this.ears[1].rotation.z = -Math.sin(frame.time * 1.8) * 0.03 - (gaitSpeed > 0 ? Math.sin(frame.time * gaitSpeed) * 0.08 : 0);

    // Natural chest and ribcage respiration (breathing)
    if (!frame.reducedMotion) {
      const breathSpeed = frame.behavior === "sleeping" ? 1.5 : ["running", "chasing", "fetch"].includes(frame.behavior) ? 5.0 : 2.2;
      const breathDepth = frame.behavior === "sleeping" ? 0.032 : ["running", "chasing", "fetch"].includes(frame.behavior) ? 0.04 : 0.02;
      const breath = Math.sin(frame.time * breathSpeed);
      this.body.scale.set(
        1 + breath * (breathDepth * 0.4),
        1 + breath * breathDepth,
        1 + breath * (breathDepth * 0.7),
      );
    }

    // Natural autonomous eyelid blinking
    if (frame.behavior === "sleeping") {
      this.eyelids.forEach((lid) => {
        lid.scale.y = 1.0;
      });
    } else if (frame.behavior === "down") {
      this.eyelids.forEach((lid) => {
        lid.scale.y = 0.55;
      });
    } else if (!frame.reducedMotion) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= this.nextBlinkTime) {
        const blinkPhase = (this.blinkTimer - this.nextBlinkTime) / 0.16;
        if (blinkPhase <= 1) {
          const blinkScale = Math.sin(blinkPhase * Math.PI);
          this.eyelids.forEach((lid) => {
            lid.scale.y = Math.max(0.01, blinkScale);
          });
        } else {
          this.eyelids.forEach((lid) => {
            lid.scale.y = 0.01;
          });
          this.blinkTimer = 0;
          this.nextBlinkTime = 3.2 + Math.random() * 3.8;
        }
      } else {
        this.eyelids.forEach((lid) => {
          lid.scale.y = 0.01;
        });
      }
    }

    this.applyBehavior(frame);
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(220, 180, false);
  }

  dispose(): void {
    this.gltfBones.clear();
    this.initialBoneRotations.clear();
    this.initialBonePositions.clear();
    this.dogMesh = null;
    if (this.gltfModel) {
      this.scene.remove(this.gltfModel);
      this.gltfModel = null;
    }
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.renderer.dispose();
  }

  async loadGLTFModel(url: string): Promise<boolean> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(url);
      if (this.gltfModel) {
        this.scene.remove(this.gltfModel);
        this.gltfModel = null;
      }
      this.gltfBones.clear();
      this.initialBoneRotations.clear();
      this.initialBonePositions.clear();
      this.dogMesh = null;

      this.gltfModel = gltf.scene;

      const box = new THREE.Box3().setFromObject(this.gltfModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      // Large, prominent retriever size filling canvas naturally in all scales:
      const targetSpan = 3.85;
      const scale = targetSpan / (maxDim || 1);
      this.gltfModel.scale.setScalar(scale);

      const center = new THREE.Vector3();
      box.getCenter(center);
      this.gltfModel.position.set(-center.x * scale, -box.min.y * scale - 0.04, -center.z * scale);

      this.gltfModel.traverse((node) => {
        if (node instanceof THREE.Bone) {
          this.gltfBones.set(node.name, node);
          this.initialBoneRotations.set(node.name, node.rotation.clone());
          this.initialBonePositions.set(node.name, node.position.clone());
        }
        if (node instanceof THREE.SkinnedMesh) {
          this.dogMesh = node;
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material instanceof THREE.MeshStandardMaterial) {
            // Keep the authentic canine facial texture with sharp dark eyes, black wet nose, mouth & paws
            const baseMap = node.material.map;
            const normMap = node.material.normalMap;
            const roughMap = node.material.roughnessMap;

            // Eliminate any washed-out white emissive glare from the GLTF file
            node.material.emissive.setHex(0x000000);
            node.material.emissiveMap = null;

            // Pure neutral white tint so the authored texture colors (dark eyes, black nose, golden coat) remain 100% crisp
            node.material.color.setHex(0xffffff);

            // Refined normal scale for realistic fur grain without eye or nostril distortion
            if (normMap) {
              node.material.normalScale.set(0.35, 0.35);
            }

            // Honor the authored roughness map: 0.0 on eyes = crystal-clear glossy eyes, 0.8 on body = soft fur
            node.material.roughness = 1.0;
            node.material.metalness = 0.0;
            node.material.needsUpdate = true;
          }
        } else if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      this.scene.add(this.gltfModel);
      this.root.visible = false;
      this.isModelLoaded = true;
      return true;
    } catch (err) {
      console.info("Using procedural Golden Retriever fallback:", err);
      if (this.gltfModel) {
        this.scene.remove(this.gltfModel);
        this.gltfModel = null;
      }
      this.root.visible = true;
      this.isModelLoaded = false;
      return false;
    }
  }

  private updateCanineKinematics(frame: ThreePetFrame, dt: number): void {
    if (this.gltfBones.size === 0) return;

    for (const [name, bone] of this.gltfBones) {
      const initRot = this.initialBoneRotations.get(name);
      if (initRot) bone.rotation.copy(initRot);
      const initPos = this.initialBonePositions.get(name);
      if (initPos) bone.position.copy(initPos);
    }

    if (this.dogMesh?.morphTargetInfluences) {
      // Natural rhythmic chest breathing
      const breathSpeed = ["running", "chasing"].includes(frame.behavior) ? 5.5 : 2.2;
      const breathAmp = frame.behavior === "sleeping" ? 0.45 : 0.28;
      this.dogMesh.morphTargetInfluences[0] = Math.sin(frame.time * breathSpeed) * breathAmp + breathAmp;

      // Realistic discrete eye blink (eyes open 96% of the time, soft blink every 4s, closed when sleeping)
      let blink = 0;
      if (frame.behavior === "sleeping") {
        blink = 1.0;
      } else {
        const blinkCycle = frame.time % 4.2;
        if (blinkCycle < 0.14) {
          blink = Math.sin((blinkCycle / 0.14) * Math.PI);
        }
      }
      this.dogMesh.morphTargetInfluences[1] = blink;
    }

    const root = this.gltfBones.get("DogROOTSHJnt");
    const spine1 = this.gltfBones.get("Dog_Spine_01SHJnt");
    const spine2 = this.gltfBones.get("Dog_Spine_02SHJnt");
    const spineTop = this.gltfBones.get("Dog_Spine_TopSHJnt");
    const neck1 = this.gltfBones.get("Dog_Neck_01SHJnt");
    const neckTop = this.gltfBones.get("Dog_Neck_TopSHJnt");
    const jaw = this.gltfBones.get("Dog_Head_JawSHJnt");
    const leftEar = this.gltfBones.get("Dog_l_Ear_01_01SHJnt");
    const rightEar = this.gltfBones.get("Dog_r_Ear_01_01SHJnt");
    const leftFrontHip = this.gltfBones.get("Dog_l_FrontLeg_HipSHJnt");
    const leftFrontKnee = this.gltfBones.get("Dog_l_FrontLeg_KneeSHJnt");
    const leftFrontAnkle = this.gltfBones.get("Dog_l_FrontLeg_AnkleSHJnt");
    const rightFrontHip = this.gltfBones.get("Dog_r_FrontLeg_HipSHJnt");
    const rightFrontKnee = this.gltfBones.get("Dog_r_FrontLeg_KneeSHJnt");
    const rightFrontAnkle = this.gltfBones.get("Dog_r_FrontLeg_AnkleSHJnt");
    const leftHindHip = this.gltfBones.get("Dog_l_HindLeg_HipSHJnt");
    const leftHindKnee = this.gltfBones.get("Dog_l_HindLeg_Knee1SHJnt");
    const leftHindAnkle = this.gltfBones.get("Wolf_l_HindLeg_AnkleSHJnt");
    const rightHindHip = this.gltfBones.get("Dog_r_HindLeg_HipSHJnt");
    const rightHindKnee = this.gltfBones.get("Dog_r_HindLeg_Knee1SHJnt");
    const rightHindAnkle = this.gltfBones.get("Dog_r_HindLeg_AnkleSHJnt");

    const tailBones = [
      this.gltfBones.get("Dog_Tail_01_02SHJnt"),
      this.gltfBones.get("Dog_Tail_01_03SHJnt"),
      this.gltfBones.get("Dog_Tail_01_04SHJnt"),
      this.gltfBones.get("Dog_Tail_01_05SHJnt"),
    ].filter(Boolean) as THREE.Bone[];

    // Target transforms for all anatomical groups
    let targetRootPosY = 0;
    let targetRootPosZ = 0;
    let targetSpine1Pitch = 0;
    let targetSpine2Pitch = 0;
    let targetSpineTopPitch = 0;
    let targetSpineYaw = 0;
    let targetNeck1Pitch = 0;
    let targetNeckTopPitch = 0;
    let targetNeckTopYaw = 0;
    let targetJawOpen = 0;
    let targetLeftFrontHip = 0;
    let targetLeftFrontKnee = 0;
    let targetLeftFrontAnkle = 0;
    let targetRightFrontHip = 0;
    let targetRightFrontKnee = 0;
    let targetRightFrontAnkle = 0;
    let targetLeftHindHip = 0;
    let targetLeftHindKnee = 0;
    let targetLeftHindAnkle = 0;
    let targetRightHindHip = 0;
    let targetRightHindKnee = 0;
    let targetRightHindAnkle = 0;
    let targetLeftEarX = 0;
    let targetRightEarX = 0;
    let targetLeftEarZ = 0;
    let targetRightEarZ = 0;

    const behavior = frame.behavior;

    if (behavior === "walking") {
      const cadence = 6.2;
      const gait = Math.sin(frame.time * cadence);
      const gaitCos = Math.cos(frame.time * cadence);

      targetLeftFrontHip = gait * 0.38;
      targetLeftFrontKnee = gait < 0 ? Math.sin(-gait * Math.PI * 0.5) * 0.48 : 0;
      targetLeftFrontAnkle = gait * 0.15;

      targetRightFrontHip = -gait * 0.38;
      targetRightFrontKnee = gait > 0 ? Math.sin(gait * Math.PI * 0.5) * 0.48 : 0;
      targetRightFrontAnkle = -gait * 0.15;

      targetLeftHindHip = -gait * 0.32;
      targetLeftHindKnee = gait > 0 ? -Math.sin(gait * Math.PI * 0.5) * 0.40 : 0;
      targetLeftHindAnkle = -gait * 0.14;

      targetRightHindHip = gait * 0.32;
      targetRightHindKnee = gait < 0 ? -Math.sin(-gait * Math.PI * 0.5) * 0.40 : 0;
      targetRightHindAnkle = gait * 0.14;

      targetSpineYaw = gait * 0.05;
      targetNeckTopPitch = -0.05 + Math.abs(gaitCos) * 0.05;
      targetLeftEarX = Math.abs(gait) * 0.07;
      targetRightEarX = Math.abs(gait) * 0.07;
    } else if (["running", "chasing"].includes(behavior)) {
      const speed = 11.5;
      const cycle = frame.time * speed;
      const s1 = Math.sin(cycle);
      const s2 = Math.sin(cycle + 0.35);
      const s3 = Math.sin(cycle + 2.2);
      const s4 = Math.sin(cycle + 2.5);

      targetLeftFrontHip = s1 * 0.62;
      targetLeftFrontKnee = s1 < 0 ? Math.sin(-s1 * Math.PI * 0.5) * 0.60 : 0;

      targetRightFrontHip = s2 * 0.62;
      targetRightFrontKnee = s2 < 0 ? Math.sin(-s2 * Math.PI * 0.5) * 0.60 : 0;

      targetLeftHindHip = s3 * 0.52;
      targetLeftHindKnee = s3 < 0 ? -Math.sin(-s3 * Math.PI * 0.5) * 0.48 : 0;

      targetRightHindHip = s4 * 0.52;
      targetRightHindKnee = s4 < 0 ? -Math.sin(-s4 * Math.PI * 0.5) * 0.48 : 0;

      targetSpine1Pitch = s1 * 0.14;
      targetNeck1Pitch = 0.10;
      targetNeckTopPitch = s1 * 0.08;
      targetJawOpen = 0.12;
      targetLeftEarX = 0.20;
      targetRightEarX = 0.20;
    } else if (behavior === "sit") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;

      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;
      targetLeftHindAnkle = 0.35;
      targetRightHindAnkle = 0.35;

      targetLeftFrontHip = 0.12;
      targetRightFrontHip = 0.12;
      targetLeftFrontKnee = -0.05;
      targetRightFrontKnee = -0.05;

      targetSpine1Pitch = -0.28;
      targetSpine2Pitch = -0.18;
      targetNeck1Pitch = -0.20;
      targetNeckTopPitch = -0.15;
    } else if (behavior === "down") {
      targetRootPosY = -0.42;

      targetLeftFrontHip = -0.55;
      targetRightFrontHip = -0.55;
      targetLeftFrontKnee = 0.25;
      targetRightFrontKnee = 0.25;

      targetLeftHindHip = 0.50;
      targetRightHindHip = 0.50;
      targetLeftHindKnee = -0.70;
      targetRightHindKnee = -0.70;

      targetNeck1Pitch = 0.22;
      targetNeckTopPitch = 0.15;
    } else if (behavior === "sleeping") {
      targetRootPosY = -0.44;

      targetLeftFrontHip = -0.55;
      targetRightFrontHip = -0.55;
      targetLeftFrontKnee = 0.25;
      targetRightFrontKnee = 0.25;

      targetLeftHindHip = 0.50;
      targetRightHindHip = 0.50;
      targetLeftHindKnee = -0.70;
      targetRightHindKnee = -0.70;

      targetNeck1Pitch = 0.35;
      targetNeckTopPitch = 0.25;
    } else if (behavior === "handshake") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;
      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;

      targetSpine1Pitch = -0.28;
      targetLeftFrontHip = 0.12;

      targetRightFrontHip = -0.85;
      targetRightFrontKnee = 0.42;
      targetRightFrontAnkle = -0.25;

      targetNeckTopYaw = 0.12;
      targetNeckTopPitch = -0.12;
    } else if (behavior === "hi-five") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;
      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;

      targetSpine1Pitch = -0.32;
      targetLeftFrontHip = 0.12;

      targetRightFrontHip = -1.35;
      targetRightFrontKnee = 0.55;
      targetRightFrontAnkle = -0.30;

      targetNeckTopPitch = -0.25;
      targetJawOpen = 0.18;
    } else if (behavior === "salute") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;
      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;

      targetSpine1Pitch = -0.32;
      targetLeftFrontHip = 0.12;

      targetRightFrontHip = -1.15;
      targetRightFrontKnee = 1.05;
      targetRightFrontAnkle = -0.45;

      targetNeck1Pitch = -0.25;
      targetNeckTopPitch = -0.15;
    } else if (behavior === "namaste") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;
      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;

      targetSpine1Pitch = -0.50;
      targetSpine2Pitch = -0.30;

      // Both front paws raised together in front of chest in Namaste prayer clasp
      targetLeftFrontHip = -1.05;
      targetLeftFrontKnee = 0.70;
      targetLeftFrontAnkle = -0.20;

      targetRightFrontHip = -1.05;
      targetRightFrontKnee = 0.70;
      targetRightFrontAnkle = -0.20;

      targetNeck1Pitch = -0.20;
      targetNeckTopPitch = -0.15;
      targetNeckTopYaw = Math.sin(frame.time * 2) * 0.05;
    } else if (behavior === "speak") {
      const barkPulse = Math.max(0, Math.sin(frame.time * 14));
      targetJawOpen = barkPulse * 0.42;
      targetNeckTopPitch = -0.05 - barkPulse * 0.16;
      targetSpine1Pitch = barkPulse * 0.06;
      targetLeftEarX = -0.10;
      targetRightEarX = -0.10;
    } else if (behavior === "feed") {
      targetNeck1Pitch = 0.48;
      targetNeckTopPitch = 0.32;
      targetJawOpen = Math.max(0, Math.sin(frame.time * 8)) * 0.24;
    } else if (behavior === "treat") {
      targetNeck1Pitch = -0.20;
      targetNeckTopPitch = -0.32;
      const chew = Math.max(0, Math.sin(frame.time * 9));
      targetJawOpen = chew * 0.35;
    } else if (behavior === "fetch") {
      if (frame.progress < 0.45) {
        // Run eagerly towards ball
        const s = Math.sin(frame.time * 11);
        targetLeftFrontHip = s * 0.55;
        targetLeftFrontKnee = s < 0 ? Math.sin(-s * Math.PI * 0.5) * 0.52 : 0;
        targetRightFrontHip = -s * 0.55;
        targetRightFrontKnee = s > 0 ? Math.sin(s * Math.PI * 0.5) * 0.52 : 0;
      } else if (frame.progress < 0.65) {
        // Snap onto ball
        targetNeckTopPitch = -0.22;
        targetJawOpen = 0.38;
      } else {
        // Trot back holding ball
        const s = Math.sin(frame.time * 7);
        targetLeftFrontHip = s * 0.35;
        targetRightFrontHip = -s * 0.35;
        targetJawOpen = 0.22;
        targetNeckTopPitch = -0.15;
      }
    } else if (behavior === "ask-food") {
      targetRootPosY = -0.28;
      targetRootPosZ = -0.10;
      targetLeftHindHip = 0.55;
      targetRightHindHip = 0.55;
      targetLeftHindKnee = -0.85;
      targetRightHindKnee = -0.85;

      targetSpine1Pitch = -0.25;
      targetLeftFrontHip = 0.12;

      // Gentle pleading paw tap
      targetRightFrontHip = -0.45 + Math.sin(frame.time * 4) * 0.18;
      targetRightFrontKnee = 0.35;

      targetNeckTopYaw = Math.sin(frame.time * 2.8) * 0.16;
      targetNeckTopPitch = -0.18;
    } else if (behavior === "surprise") {
      const step = Math.sin(frame.progress * Math.PI * 12);
      targetLeftFrontHip = step * 0.30;
      targetRightFrontHip = -step * 0.30;
      targetLeftHindHip = -step * 0.28;
      targetRightHindHip = step * 0.28;
      targetNeckTopYaw = 0.18;
    } else if (behavior === "roll-over") {
      const p = frame.progress;
      if (p >= 0.20 && p <= 0.80) {
        targetLeftFrontHip = -0.55;
        targetRightFrontHip = -0.55;
        targetLeftFrontKnee = 0.65;
        targetRightFrontKnee = 0.65;
        targetLeftHindHip = 0.50;
        targetRightHindHip = 0.50;
        targetLeftHindKnee = -0.75;
        targetRightHindKnee = -0.75;
      }
    } else if (behavior === "jump") {
      const p = frame.progress;
      if (p < 0.25) {
        targetRootPosY = -0.20;
        targetLeftFrontHip = 0.25;
        targetRightFrontHip = 0.25;
        targetLeftHindHip = 0.35;
        targetRightHindHip = 0.35;
      } else if (p < 0.70) {
        targetLeftFrontHip = 0.55;
        targetRightFrontHip = 0.55;
        targetLeftHindHip = -0.45;
        targetRightHindHip = -0.45;
        targetNeckTopPitch = -0.20;
      } else {
        targetLeftFrontHip = -0.20;
        targetRightFrontHip = -0.20;
        targetLeftHindHip = 0.20;
        targetRightHindHip = 0.20;
      }
    } else {
      // Idle: soft inquisitive canine posture
      targetNeckTopYaw = Math.sin(frame.time * 1.1) * 0.08;
      targetNeckTopPitch = -0.05 + Math.sin(frame.time * 0.8) * 0.04;
      targetLeftEarZ = Math.sin(frame.time * 2.0) * 0.05;
      targetRightEarZ = -Math.sin(frame.time * 2.0) * 0.05;
    }

    // Exponential temporal smoothing across all joints for continuous, butter-smooth motion
    const k = 10.0;
    this.currentRootPosY = smoothDamp(this.currentRootPosY, targetRootPosY, k, dt);
    this.currentRootPosZ = smoothDamp(this.currentRootPosZ, targetRootPosZ, k, dt);
    this.currentSpine1Pitch = smoothDamp(this.currentSpine1Pitch, targetSpine1Pitch, k, dt);
    this.currentSpine2Pitch = smoothDamp(this.currentSpine2Pitch, targetSpine2Pitch, k, dt);
    this.currentSpineTopPitch = smoothDamp(this.currentSpineTopPitch, targetSpineTopPitch, k, dt);
    this.currentSpineYaw = smoothDamp(this.currentSpineYaw, targetSpineYaw, k, dt);
    this.currentNeck1Pitch = smoothDamp(this.currentNeck1Pitch, targetNeck1Pitch, k, dt);
    this.currentNeckTopPitch = smoothDamp(this.currentNeckTopPitch, targetNeckTopPitch, k, dt);
    this.currentNeckTopYaw = smoothDamp(this.currentNeckTopYaw, targetNeckTopYaw, k, dt);
    this.currentJawOpen = smoothDamp(this.currentJawOpen, targetJawOpen, k * 1.4, dt);
    this.currentLeftFrontHip = smoothDamp(this.currentLeftFrontHip, targetLeftFrontHip, k * 1.2, dt);
    this.currentLeftFrontKnee = smoothDamp(this.currentLeftFrontKnee, targetLeftFrontKnee, k * 1.2, dt);
    this.currentLeftFrontAnkle = smoothDamp(this.currentLeftFrontAnkle, targetLeftFrontAnkle, k * 1.2, dt);
    this.currentRightFrontHip = smoothDamp(this.currentRightFrontHip, targetRightFrontHip, k * 1.2, dt);
    this.currentRightFrontKnee = smoothDamp(this.currentRightFrontKnee, targetRightFrontKnee, k * 1.2, dt);
    this.currentRightFrontAnkle = smoothDamp(this.currentRightFrontAnkle, targetRightFrontAnkle, k * 1.2, dt);
    this.currentLeftHindHip = smoothDamp(this.currentLeftHindHip, targetLeftHindHip, k * 1.2, dt);
    this.currentLeftHindKnee = smoothDamp(this.currentLeftHindKnee, targetLeftHindKnee, k * 1.2, dt);
    this.currentLeftHindAnkle = smoothDamp(this.currentLeftHindAnkle, targetLeftHindAnkle, k * 1.2, dt);
    this.currentRightHindHip = smoothDamp(this.currentRightHindHip, targetRightHindHip, k * 1.2, dt);
    this.currentRightHindKnee = smoothDamp(this.currentRightHindKnee, targetRightHindKnee, k * 1.2, dt);
    this.currentRightHindAnkle = smoothDamp(this.currentRightHindAnkle, targetRightHindAnkle, k * 1.2, dt);
    this.currentLeftEarX = smoothDamp(this.currentLeftEarX, targetLeftEarX, k, dt);
    this.currentRightEarX = smoothDamp(this.currentRightEarX, targetRightEarX, k, dt);
    this.currentLeftEarZ = smoothDamp(this.currentLeftEarZ, targetLeftEarZ, k, dt);
    this.currentRightEarZ = smoothDamp(this.currentRightEarZ, targetRightEarZ, k, dt);

    // Apply smoothed transforms to skeleton
    if (root) {
      root.position.y += this.currentRootPosY;
      root.position.z += this.currentRootPosZ;
    }
    spine1?.rotateX(this.currentSpine1Pitch);
    spine1?.rotateY(this.currentSpineYaw);
    spine2?.rotateX(this.currentSpine2Pitch);
    spineTop?.rotateX(this.currentSpineTopPitch);

    neck1?.rotateX(this.currentNeck1Pitch);
    neckTop?.rotateX(this.currentNeckTopPitch);
    neckTop?.rotateY(this.currentNeckTopYaw);
    jaw?.rotateX(this.currentJawOpen);

    leftFrontHip?.rotateX(this.currentLeftFrontHip);
    leftFrontKnee?.rotateX(this.currentLeftFrontKnee);
    leftFrontAnkle?.rotateX(this.currentLeftFrontAnkle);

    rightFrontHip?.rotateX(this.currentRightFrontHip);
    rightFrontKnee?.rotateX(this.currentRightFrontKnee);
    rightFrontAnkle?.rotateX(this.currentRightFrontAnkle);

    leftHindHip?.rotateX(this.currentLeftHindHip);
    leftHindKnee?.rotateX(this.currentLeftHindKnee);
    leftHindAnkle?.rotateX(this.currentLeftHindAnkle);

    rightHindHip?.rotateX(this.currentRightHindHip);
    rightHindKnee?.rotateX(this.currentRightHindKnee);
    rightHindAnkle?.rotateX(this.currentRightHindAnkle);

    leftEar?.rotateX(this.currentLeftEarX);
    leftEar?.rotateZ(this.currentLeftEarZ);
    rightEar?.rotateX(this.currentRightEarX);
    rightEar?.rotateZ(this.currentRightEarZ);

    // Natural horizontal wagging with gentle vertical harmonic lift
    const wagFreq = ["sit", "handshake", "hi-five", "feed", "treat", "fetch"].includes(behavior) ? 7.2 : 3.4;
    const wagAmp = behavior === "sleeping" ? 0.04 : 0.25;
    tailBones.forEach((b, i) => {
      // RotateX wags horizontally in local tail bone coordinates
      b.rotateX(Math.sin(frame.time * wagFreq - i * 0.32) * wagAmp);
      b.rotateZ(Math.cos(frame.time * wagFreq * 0.5 - i * 0.2) * wagAmp * 0.35);
    });
  }

  private buildBody(): void {
    const torso = this.mesh(new THREE.SphereGeometry(0.92, 36, 24), this.golden);
    torso.scale.set(1.46, 0.72, 0.76);
    torso.position.y = 0.94;
    this.body.add(torso);

    const ribCage = this.mesh(new THREE.SphereGeometry(0.72, 32, 22), this.golden);
    ribCage.scale.set(0.9, 0.96, 0.98);
    ribCage.position.set(0.42, 0.95, 0);
    this.body.add(ribCage);

    const chest = this.mesh(new THREE.SphereGeometry(0.62, 32, 22), this.lightGolden);
    chest.scale.set(0.72, 1.06, 0.9);
    chest.position.set(0.78, 0.96, 0);
    this.body.add(chest);

    const rump = this.mesh(new THREE.SphereGeometry(0.72, 32, 22), this.golden);
    rump.scale.set(0.88, 0.84, 0.94);
    rump.position.set(-0.72, 0.96, 0);
    this.body.add(rump);

    const chestRuff = this.mesh(new THREE.SphereGeometry(0.54, 30, 20), this.cream);
    chestRuff.scale.set(0.56, 0.96, 0.78);
    chestRuff.position.set(0.88, 0.72, 0);
    this.body.add(chestRuff);

    const throatRuff = this.mesh(new THREE.SphereGeometry(0.43, 28, 18), this.lightGolden);
    throatRuff.scale.set(0.58, 1.05, 0.9);
    throatRuff.position.set(0.98, 1.2, 0);
    this.body.add(throatRuff);

    const backShade = this.mesh(
      new THREE.SphereGeometry(0.72, 28, 18),
      new THREE.MeshStandardMaterial({ color: 0x9a501d, roughness: 0.94 }),
    );
    backShade.scale.set(1.38, 0.1, 0.74);
    backShade.position.set(-0.12, 1.44, 0);
    this.body.add(backShade);
  }

  private buildFur(): void {
    const furMaterial = new THREE.MeshStandardMaterial({
      color: 0xd69345,
      roughness: 1,
      metalness: 0,
    });
    const creamFur = new THREE.MeshStandardMaterial({
      color: 0xf6dba1,
      roughness: 1,
      metalness: 0,
    });

    // A few low-opacity shells soften the silhouette without creating cloudy patches.
    for (let i = 1; i <= 3; i++) {
      const progress = i / 3;
      const shellScale = new THREE.Vector3(
        1.46 * (1.0 + progress * 0.025),
        0.72 * (1.0 + progress * 0.032),
        0.76 * (1.0 + progress * 0.032),
      );
      const shellOpacity = 0.1 * (1.0 - progress * 0.68);
      this.addCoatShell(
        this.body,
        new THREE.SphereGeometry(0.92, 36, 24),
        shellScale,
        new THREE.Vector3(0, 0.94, 0),
        0xd69345,
        shellOpacity,
      );
    }

    for (let i = 1; i <= 2; i++) {
      const progress = i / 2;
      const shellScale = new THREE.Vector3(
        0.72 * (1.0 + progress * 0.03),
        1.06 * (1.0 + progress * 0.035),
        0.9 * (1.0 + progress * 0.035),
      );
      const shellOpacity = 0.09 * (1.0 - progress * 0.65);
      this.addCoatShell(
        this.body,
        new THREE.SphereGeometry(0.62, 32, 20),
        shellScale,
        new THREE.Vector3(0.78, 0.96, 0),
        0xeeb462,
        shellOpacity,
      );
    }

    for (let i = 1; i <= 2; i++) {
      const progress = i / 2;
      const shellScale = new THREE.Vector3(
        0.88 * (1.0 + progress * 0.022),
        0.96 * (1.0 + progress * 0.026),
        1.04 * (1.0 + progress * 0.026),
      );
      const shellOpacity = 0.08 * (1.0 - progress * 0.65);
      this.addCoatShell(
        this.head,
        new THREE.SphereGeometry(0.58, 36, 24),
        shellScale,
        new THREE.Vector3(),
        0xd69345,
        shellOpacity,
      );
    }

    const rootObj = new THREE.Vector3();
    const outwardObj = new THREE.Vector3();

    // One continuous body coat avoids visible boundaries between fur regions.
    const rows = 64;
    const cols = 88;
    for (let row = 0; row < rows; row += 1) {
      const xProgress = row / (rows - 1);
      const jitterX = Math.sin(row * 17.31) * (1.1 / rows);
      const x = -1.18 + xProgress * 2.36 + jitterX;
      const normX = x / 1.46;
      const rCross = Math.sqrt(Math.max(0, 0.92 * 0.92 - normX * normX));
      for (let column = 0; column < cols; column += 1) {
        const strandIndex = row * cols + column;
        const jitterAngle = Math.sin(strandIndex * 9.73) * (Math.PI / cols);
        const angle = (column / cols) * Math.PI * 2 + jitterAngle;
        const side = Math.sin(angle);
        const vertical = Math.cos(angle);
        const underside = THREE.MathUtils.smoothstep(-vertical, 0.15, 0.82);
        const chest = THREE.MathUtils.smoothstep(x, 0.2, 1.05) *
          THREE.MathUtils.smoothstep(-vertical, -0.1, 0.75);
        const coatLength = 0.026 + underside * 0.018 + chest * 0.018 +
          ((strandIndex % 5) * 0.002);

        rootObj.set(
          x,
          0.94 + vertical * rCross * 0.718,
          side * rCross * 0.755,
        );
        outwardObj.set(
          normX * 0.3,
          vertical,
          side,
        ).normalize();

        this.addHairStrand(
          this.body,
          rootObj,
          outwardObj,
          coatLength,
          chest > 0.7 && vertical < 0.2 ? creamFur : furMaterial,
          strandIndex * 0.17,
          0.003,
        );
      }
    }

    // Short, even facial coat keeps the eyes and muzzle readable.
    const lats = 24;
    const longs = 40;
    for (let latitude = 0; latitude < lats; latitude += 1) {
      for (let longitude = 0; longitude < longs; longitude += 1) {
        const strandIndex = latitude * longs + longitude;
        const jitterLat = Math.sin(strandIndex * 7.13) * (Math.PI * 0.25 / lats);
        const jitterLong = Math.cos(strandIndex * 5.77) * (Math.PI * 0.5 / longs);
        const phi = ((latitude + 0.5) / lats) * Math.PI + jitterLat;
        const theta = (longitude / longs) * Math.PI * 2 + jitterLong;

        const ox = Math.cos(theta) * Math.sin(phi);
        const oy = Math.cos(phi);
        const oz = Math.sin(theta) * Math.sin(phi);

        rootObj.set(
          ox * 0.51,
          oy * 0.56,
          oz * 0.6,
        );
        outwardObj.set(ox, oy, oz);

        this.addHairStrand(
          this.head,
          rootObj,
          outwardObj,
          0.014 + (strandIndex % 4) * 0.002,
          furMaterial,
          strandIndex * 0.13,
          0.002,
        );
      }
    }

    for (let index = 0; index < 360; index += 1) {
      const phi = Math.acos(1 - 2 * ((index + 0.5) / 360));
      const theta = index * Math.PI * (3 - Math.sqrt(5));
      const ox = Math.cos(theta) * Math.sin(phi);
      const oy = Math.cos(phi);
      const oz = Math.sin(theta) * Math.sin(phi);

      const rootX = ox * 0.37 * 1.28;
      const rootY = oy * 0.37 * 0.66;
      const rootZ = oz * 0.37 * 0.92;

      rootObj.set(rootX, rootY, rootZ);
      outwardObj.set(ox * 0.2, oy, oz).normalize();

      this.addHairStrand(
        this.muzzle,
        rootObj,
        outwardObj,
        0.009 + (index % 3) * 0.0015,
        creamFur,
        index * 0.11,
        0.001,
      );
    }

    // Cylindrical sampling keeps leg hair even instead of forming side patches.
    for (const leg of this.legs) {
      const upperRows = 11;
      const upperColumns = 18;
      for (let row = 0; row < upperRows; row += 1) {
        const y = -0.04 - (row / (upperRows - 1)) * 0.5;
        const radius = THREE.MathUtils.lerp(0.185, 0.165, row / (upperRows - 1));
        for (let column = 0; column < upperColumns; column += 1) {
          const index = row * upperColumns + column;
          const angle = (column / upperColumns) * Math.PI * 2;
          rootObj.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          outwardObj.set(Math.cos(angle), -0.16, Math.sin(angle)).normalize();
          this.addHairStrand(
            leg.group,
            rootObj,
            outwardObj,
            0.025 + (index % 4) * 0.003,
            furMaterial,
            index * 0.09,
            0.002,
          );
        }
      }

      const lowerRows = 9;
      const lowerColumns = 16;
      for (let row = 0; row < lowerRows; row += 1) {
        const y = -0.03 - (row / (lowerRows - 1)) * 0.34;
        const radius = THREE.MathUtils.lerp(0.15, 0.13, row / (lowerRows - 1));
        for (let column = 0; column < lowerColumns; column += 1) {
          const index = row * lowerColumns + column;
          const angle = (column / lowerColumns) * Math.PI * 2;
          rootObj.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          outwardObj.set(Math.cos(angle), -0.18, Math.sin(angle)).normalize();
          this.addHairStrand(
            leg.lower,
            rootObj,
            outwardObj,
            0.026 + (index % 3) * 0.003,
            creamFur,
            index * 0.1,
            0.002,
          );
        }
      }
    }

    // Sparse, tapered ear feathering reads as soft hair rather than a fringe curtain.
    this.ears.forEach((ear, earIndex) => {
      const earRows = 7;
      const earColumns = 8;
      for (let row = 0; row < earRows; row += 1) {
        const yProgress = row / (earRows - 1);
        for (let column = 0; column < earColumns; column += 1) {
          const across = column / (earColumns - 1);
          const index = row * earColumns + column;
          const side = earIndex === 0 ? 1 : -1;
          rootObj.set(
            (across - 0.5) * 0.28,
            0.12 - yProgress * 0.5,
            side * 0.1,
          );
          outwardObj.set(-0.08, -0.9, side * 0.15).normalize();
          this.addHairStrand(
            ear,
            rootObj,
            outwardObj,
            0.035 + yProgress * 0.035 + (column % 2) * 0.004,
            this.darkGolden,
            index * 0.12,
            0.003,
          );
        }
      }
    });
  }

  private buildHead(): [THREE.Mesh, THREE.Mesh] {
    this.head.position.set(1.2, 1.46, 0);
    this.body.add(this.head);

    const skull = this.mesh(new THREE.SphereGeometry(0.58, 36, 24), this.golden);
    skull.scale.set(0.88, 0.96, 1.04);
    this.head.add(skull);

    const crown = this.mesh(new THREE.SphereGeometry(0.46, 30, 20), this.lightGolden);
    crown.scale.set(0.72, 0.7, 1.02);
    crown.position.set(-0.02, 0.2, 0);
    this.head.add(crown);

    for (const z of [-0.29, 0.29]) {
      const cheek = this.mesh(new THREE.SphereGeometry(0.31, 26, 18), this.golden);
      cheek.scale.set(0.82, 0.82, 0.72);
      cheek.position.set(0.12, -0.09, z);
      this.head.add(cheek);
    }

    this.muzzle.position.set(0.45, -0.1, 0);
    this.head.add(this.muzzle);

    const muzzleBridge = this.mesh(new THREE.SphereGeometry(0.37, 32, 20), this.cream);
    muzzleBridge.scale.set(1.28, 0.66, 0.92);
    this.muzzle.add(muzzleBridge);

    for (const z of [-0.15, 0.15]) {
      const jowl = this.mesh(new THREE.SphereGeometry(0.26, 26, 18), this.cream);
      jowl.scale.set(1.2, 0.86, 0.82);
      jowl.position.set(0.06, -0.08, z);
      this.muzzle.add(jowl);
    }

    const chin = this.mesh(new THREE.SphereGeometry(0.25, 24, 16), this.lightGolden);
    chin.scale.set(1.1, 0.42, 0.76);
    chin.position.set(0.06, -0.24, 0);
    this.muzzle.add(chin);

    const nose = this.mesh(new THREE.SphereGeometry(0.19, 28, 18), this.wetNose);
    nose.scale.set(0.85, 0.65, 1.05);
    nose.position.set(0.38, 0.05, 0);
    this.muzzle.add(nose);

    // Anatomical nostrils (two dark recessed cavities)
    for (const z of [-0.07, 0.07]) {
      const nostril = this.mesh(new THREE.CapsuleGeometry(0.032, 0.045, 6, 12), this.black);
      nostril.scale.set(0.65, 1.1, 0.85);
      nostril.position.set(0.44, 0.035, z);
      nostril.rotation.z = -0.3;
      nostril.rotation.y = z < 0 ? -0.25 : 0.25;
      this.muzzle.add(nostril);
    }

    // Philtrum groove down from nose
    const philtrum = this.mesh(new THREE.BoxGeometry(0.018, 0.09, 0.014), this.black);
    philtrum.position.set(0.37, -0.06, 0);
    this.muzzle.add(philtrum);

    for (const z of [-0.255, 0.255]) {
      const eyeBase = this.mesh(
        new THREE.SphereGeometry(0.096, 24, 18),
        new THREE.MeshStandardMaterial({
          color: 0xeddcc8,
          roughness: 0.35,
        }),
      );
      eyeBase.scale.set(0.9, 1.04, 1);
      eyeBase.position.set(0.43, 0.18, z);
      this.head.add(eyeBase);

      const iris = this.mesh(new THREE.SphereGeometry(0.072, 24, 16), this.irisMaterial);
      iris.position.set(0.475, 0.18, z + (z < 0 ? -0.005 : 0.005));
      this.head.add(iris);

      const pupil = this.mesh(new THREE.SphereGeometry(0.042, 18, 12), this.black);
      pupil.position.set(0.505, 0.18, z + (z < 0 ? -0.008 : 0.008));
      this.head.add(pupil);

      const cornea = this.mesh(new THREE.SphereGeometry(0.098, 24, 18), this.corneaMaterial);
      cornea.scale.set(0.92, 1.05, 1.02);
      cornea.position.set(0.435, 0.18, z);
      this.head.add(cornea);

      const shine = this.mesh(
        new THREE.SphereGeometry(0.018, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      shine.position.set(0.54, 0.22, z + (z < 0 ? -0.022 : 0.022));
      this.head.add(shine);

      // Upper eyelid that blinks down
      const eyelid = this.mesh(
        new THREE.SphereGeometry(0.106, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        this.darkGolden,
      );
      eyelid.position.set(0.43, 0.185, z);
      eyelid.rotation.x = z < 0 ? 0.15 : -0.15;
      eyelid.scale.set(1.02, 0.01, 1.05);
      this.head.add(eyelid);
      this.eyelids.push(eyelid);
    }

    const leftEar = this.mesh(new THREE.CapsuleGeometry(0.22, 0.46, 8, 18), this.darkGolden);
    leftEar.scale.set(0.9, 1.02, 0.58);
    leftEar.position.set(-0.08, -0.15, 0.54);
    leftEar.rotation.z = 0.08;
    leftEar.rotation.x = -0.15;
    this.head.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.z = -0.54;
    rightEar.rotation.z = -0.08;
    rightEar.rotation.x = 0.15;
    this.head.add(rightEar);

    const collar = this.mesh(
      new THREE.TorusGeometry(0.48, 0.045, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0xb92125, roughness: 0.62 }),
    );
    collar.rotation.y = Math.PI / 2;
    collar.position.set(-0.35, -0.35, 0);
    this.head.add(collar);

    const tag = this.mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.035, 24),
      new THREE.MeshStandardMaterial({
        color: 0xe6ad28,
        roughness: 0.34,
        metalness: 0.65,
      }),
    );
    tag.rotation.z = Math.PI / 2;
    tag.position.set(-0.2, -0.53, 0);
    this.head.add(tag);

    return [leftEar, rightEar];
  }

  private buildMouth(): THREE.Mesh {
    const mouth = this.mesh(new THREE.SphereGeometry(0.18, 22, 14), this.black);
    mouth.scale.set(0.9, 0.32, 0.62);
    mouth.position.set(0.23, -0.17, 0);
    this.muzzle.add(mouth);

    const tongue = this.mesh(
      new THREE.CapsuleGeometry(0.075, 0.22, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0xe9657d, roughness: 0.72 }),
    );
    tongue.rotation.z = Math.PI / 2;
    tongue.position.set(0.22, -0.23, 0);
    tongue.visible = false;
    this.muzzle.add(tongue);
    return tongue;
  }

  private buildLeg(position: THREE.Vector3): LegRig {
    const group = new THREE.Group();
    group.position.copy(position);
    this.body.add(group);

    const upper = this.mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.58, 18), this.golden);
    upper.position.y = -0.28;
    group.add(upper);

    const lower = new THREE.Group();
    lower.position.y = -0.55;
    group.add(lower);

    const shin = this.mesh(new THREE.CylinderGeometry(0.16, 0.135, 0.42, 18), this.lightGolden);
    shin.position.y = -0.18;
    lower.add(shin);

    const paw = this.mesh(new THREE.SphereGeometry(0.2, 22, 14), this.lightGolden);
    paw.scale.set(1.3, 0.52, 1.12);
    paw.position.set(0.1, -0.42, 0);
    lower.add(paw);

    // 4 Distinct Canine Toe Knuckles on Paw Front
    const toeZ = [-0.11, -0.04, 0.04, 0.11];
    for (let t = 0; t < 4; t++) {
      const toe = this.mesh(new THREE.SphereGeometry(0.062, 12, 10), this.cream);
      toe.scale.set(1.15, 0.8, 0.85);
      toe.position.set(0.23, -0.42, toeZ[t]);
      lower.add(toe);
    }

    return { group, lower, paw };
  }

  private buildTail(): void {
    this.tail.position.set(-1.23, 1.04, 0);
    this.tail.rotation.x = Math.PI / 2;
    this.body.add(this.tail);
    let parent = this.tail;
    const rootObj = new THREE.Vector3();
    const outwardObj = new THREE.Vector3();
    for (let index = 0; index < 5; index += 1) {
      const segment = this.mesh(new THREE.CylinderGeometry(0.15 - index * 0.018, 0.13 - index * 0.018, 0.48, 14), this.golden);
      segment.rotation.x = Math.PI / 2;
      segment.position.z = -0.22;
      parent.add(segment);

      for (let i = 1; i <= 2; i++) {
        const progress = i / 2;
        const rTop = (0.15 - index * 0.018) * (1.0 + progress * 0.16);
        const rBottom = (0.13 - index * 0.018) * (1.0 + progress * 0.16);
        this.addCoatShell(
          segment,
          new THREE.CylinderGeometry(rTop, rBottom, 0.48, 14),
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(0, 0, 0),
          0xd69345,
          0.08 * (1.0 - progress * 0.65),
        );
      }

      const tailRows = 6;
      const tailColumns = 12;
      for (let row = 0; row < tailRows; row += 1) {
        const along = -0.2 + (row / (tailRows - 1)) * 0.4;
        const radius = THREE.MathUtils.lerp(
          0.14 - index * 0.018,
          0.12 - index * 0.018,
          row / (tailRows - 1),
        );
        for (let column = 0; column < tailColumns; column += 1) {
          const strandIndex = row * tailColumns + column;
          const angle = (column / tailColumns) * Math.PI * 2;
          const underside = THREE.MathUtils.smoothstep(-Math.sin(angle), 0.1, 0.9);
          rootObj.set(Math.cos(angle) * radius, along, Math.sin(angle) * radius);
          outwardObj.set(Math.cos(angle), -0.2, Math.sin(angle)).normalize();
          this.addHairStrand(
            segment,
            rootObj,
            outwardObj,
            0.028 + underside * 0.018 + (strandIndex % 3) * 0.003,
            strandIndex % 5 === 0 ? this.cream : this.lightGolden,
            index * 11 + strandIndex * 0.08,
            0.003,
          );
        }
      }
      const joint = new THREE.Group();
      joint.position.z = -0.43;
      parent.add(joint);
      this.tailJoints.push(joint);
      parent = joint;
    }
  }

  private buildBalls(): THREE.Mesh {
    const colors = [0x258be7, 0xf4b71b, 0xef4136, 0x55b957];
    colors.forEach((color, index) => {
      const ball = this.mesh(
        new THREE.SphereGeometry(0.16 - index * 0.012, 22, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.54 }),
      );
      ball.position.set(-1.32 + index * 0.25, 0.16 + (index % 2) * 0.08, 0.62 - (index % 3) * 0.2);
      this.root.add(ball);
      this.balls.push(ball);
    });

    const fetchBall = this.mesh(
      new THREE.SphereGeometry(0.19, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0xef4136, roughness: 0.48 }),
    );
    fetchBall.visible = false;
    this.root.add(fetchBall);
    return fetchBall;
  }

  private buildCareProps(): THREE.Mesh {
    const bowl = this.mesh(
      new THREE.CylinderGeometry(0.36, 0.26, 0.18, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x4b91c8, roughness: 0.42, metalness: 0.12 }),
    );
    bowl.position.y = 0.09;
    this.foodBowl.add(bowl);
    const food = this.mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.035, 24),
      new THREE.MeshStandardMaterial({ color: 0x74451f, roughness: 1 }),
    );
    food.position.y = 0.2;
    this.foodBowl.add(food);
    this.foodBowl.position.set(1.72, 0, 0.28);
    this.foodBowl.visible = false;
    this.root.add(this.foodBowl);

    const treat = this.mesh(
      new THREE.CapsuleGeometry(0.08, 0.25, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x9a5728, roughness: 0.92 }),
    );
    treat.rotation.z = Math.PI / 2;
    treat.position.set(1.7, 1.25, 0.2);
    treat.visible = false;
    this.root.add(treat);
    return treat;
  }

  private resetPose(): void {
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, this.root.rotation.y, 0);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.scale.set(1, 1, 1);
    this.head.position.set(1.2, 1.46, 0);
    this.head.rotation.set(0, 0, 0);
    this.muzzle.rotation.set(0, 0, 0);
    this.tongue.visible = false;
    this.tail.rotation.set(0, 0, -0.25);
    this.fetchBall.visible = false;
    this.foodBowl.visible = false;
    this.treat.visible = false;
    this.balls.forEach((ball) => {
      ball.visible = true;
    });

    const positions = [
      new THREE.Vector3(0.72, 0.66, 0.42),
      new THREE.Vector3(0.72, 0.66, -0.42),
      new THREE.Vector3(-0.72, 0.66, 0.42),
      new THREE.Vector3(-0.72, 0.66, -0.42),
    ];
    this.legs.forEach((leg, index) => {
      leg.group.position.copy(positions[index]);
      leg.group.rotation.set(0, 0, 0);
      leg.lower.rotation.set(0, 0, 0);
    });
  }

  private animateGait(gait: number, amount: number): void {
    const phases = [gait, -gait, -gait, gait];
    this.legs.forEach((leg, index) => {
      leg.group.rotation.z = phases[index] * amount;
      leg.lower.rotation.z = Math.max(0, -phases[index]) * amount * 0.55;
    });
  }

  private applyBehavior(frame: ThreePetFrame): void {
    const p = frame.progress;
    const lift = Math.sin(p * Math.PI);
    this.balls.forEach((ball) => {
      ball.visible = ["idle", "sleeping", "sit"].includes(frame.behavior);
    });

    switch (frame.behavior) {
      case "jump":
        this.root.position.y += lift * 1.15;
        this.legs.forEach((leg) => {
          leg.group.rotation.z *= 0.25;
          leg.lower.rotation.z = 0.85 * lift;
        });
        this.head.rotation.z = -0.12 * lift;
        this.tongue.visible = lift > 0.15;
        break;
      case "sit":
      case "handshake":
      case "hi-five":
      case "salute":
      case "namaste":
        this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, -0.94, lift);
        this.body.rotation.z = -0.18 * lift;
        this.body.position.set(-0.1 * lift, -0.14 * lift, 0);
        this.legs[2].group.rotation.z = -1.02 * lift;
        this.legs[3].group.rotation.z = -1.02 * lift;
        this.legs[2].lower.rotation.z = 1.25 * lift;
        this.legs[3].lower.rotation.z = 1.25 * lift;
        this.applyPawTrick(frame.behavior, lift);
        break;
      case "down":
      case "sleeping":
        {
          const settle = frame.behavior === "sleeping" ? p : lift;
          this.root.position.y = -0.36 * settle;
          this.body.rotation.x = frame.behavior === "sleeping" ? -0.14 * settle : 0;
          this.body.scale.y = 1 - 0.28 * settle;
          this.legs.forEach((leg, index) => {
            leg.group.rotation.z = (index < 2 ? 1.18 : -1.18) * settle;
            leg.lower.rotation.z = -0.82 * settle;
          });
          this.head.rotation.z = (frame.behavior === "sleeping" ? -0.34 : -0.12) * settle;
          this.tail.rotation.z = THREE.MathUtils.lerp(this.tail.rotation.z, -0.78, settle);
        }
        break;
      case "roll-over": {
        // Natural roll-over along the dog's local spine axis (longitudinal body axis)
        if (p < 0.22) {
          const dropProgress = p / 0.22;
          this.root.position.y = -0.34 * dropProgress;
          this.legs.forEach((leg, i) => {
            leg.group.rotation.z = (i < 2 ? 0.95 : -0.95) * dropProgress;
            leg.lower.rotation.z = -0.7 * dropProgress;
          });
          this.head.rotation.z = -0.15 * dropProgress;
        } else if (p < 0.78) {
          const rollPhase = (p - 0.22) / 0.56;
          this.root.position.y = -0.34 + Math.sin(rollPhase * Math.PI) * 0.09;
          // Rotate strictly along the local spine axis of the body
          this.body.rotation.x = rollPhase * Math.PI * 2;
          const onBack = Math.sin(rollPhase * Math.PI);
          this.legs.forEach((leg, index) => {
            leg.group.rotation.z = (index % 2 ? -0.45 : 0.45) * (1 - onBack * 0.6);
            leg.lower.rotation.z = 0.55 * onBack;
          });
          this.tongue.visible = onBack > 0.2;
        } else {
          const riseProgress = (p - 0.78) / 0.22;
          this.root.position.y = -0.34 * (1 - riseProgress);
          this.legs.forEach((leg, i) => {
            leg.group.rotation.z = (i < 2 ? 0.95 : -0.95) * (1 - riseProgress);
            leg.lower.rotation.z = -0.7 * (1 - riseProgress);
          });
          this.head.rotation.z = -0.15 * (1 - riseProgress);
        }
        break;
      }
      case "speak":
        this.head.rotation.z = Math.sin(frame.time * 18) * 0.08 * lift;
        this.muzzle.rotation.z = Math.sin(frame.time * 22) * 0.06;
        this.tongue.visible = true;
        break;
      case "fetch":
        this.tongue.visible = true;
        this.fetchBall.visible = true;
        (this.fetchBall.material as THREE.MeshStandardMaterial).color.set(frame.ballColor);
        if (p < 0.6) {
          const flight = p / 0.6;
          this.fetchBall.position.set(-2.1 + flight * 4.1, 0.25 + Math.sin(flight * Math.PI) * 1.65, 0.45);
        } else {
          this.fetchBall.position.set(1.75, 1.34, 0.18);
        }
        break;
      case "feed":
        this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, -0.55, lift);
        this.foodBowl.visible = true;
        this.head.rotation.z = -0.5 * lift;
        this.head.position.x += 0.2 * lift;
        this.head.position.y -= 0.42 * lift;
        this.tail.rotation.z = -0.15 + Math.sin(frame.time * 20) * 0.55;
        break;
      case "treat":
        this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, -0.8, lift);
        this.treat.visible = true;
        this.treat.position.y = 1.22 + Math.sin(frame.time * 8) * 0.08;
        this.head.rotation.z = -0.18 * lift;
        this.tongue.visible = lift > 0.25;
        break;
      case "ask-food":
        this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, -0.94, p);
        this.body.position.y = -0.08 * p;
        this.head.rotation.z = 0.15 * Math.sin(frame.time * 5);
        this.legs[0].group.rotation.z = 0.38 * Math.sin(frame.time * 4);
        break;
      case "surprise": {
        // Natural grounded spin: rotate smoothly around vertical ground Y axis on all fours
        const initialAngle = ((1 - frame.facing) / 2) * Math.PI;
        const spinTurn = p * Math.PI * 2;
        this.root.rotation.y = initialAngle + spinTurn;
        // Keep grounded on floor with subtle rhythmic footfall bounce
        this.root.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.035;

        // Curved spine into the turn like a dog chasing its tail
        this.body.rotation.y = Math.sin(p * Math.PI * 2) * 0.24;
        this.head.rotation.y = 0.36; // Turn head inward into the spin
        this.tail.rotation.y = -0.55 + Math.sin(frame.time * 24) * 0.35; // Excited tail wag

        // Rapid rhythmic stepping footfalls around the circle
        const stepRate = frame.time * 18;
        this.legs[0].group.rotation.z = Math.sin(stepRate) * 0.45;
        this.legs[1].group.rotation.z = Math.sin(stepRate + Math.PI) * 0.45;
        this.legs[2].group.rotation.z = Math.sin(stepRate * 0.6) * 0.28;
        this.legs[3].group.rotation.z = Math.sin(stepRate * 0.6 + Math.PI) * 0.28;
        this.tongue.visible = true;
        break;
      }
      case "running":
      case "chasing":
        this.tongue.visible = true;
        this.head.rotation.z = -0.08;
        break;
      case "idle":
        this.tongue.visible = Math.sin(frame.time * 0.7) > -0.35;
        break;
      default:
        break;
    }
  }

  private applyPawTrick(behavior: string, lift: number): void {
    if (behavior === "handshake") {
      this.legs[0].group.rotation.z = 0.7 * lift;
      this.legs[0].group.rotation.x = -0.78 * lift;
      this.legs[0].lower.rotation.z = -0.45 * lift;
    } else if (behavior === "hi-five") {
      this.legs[0].group.rotation.z = 1.62 * lift;
      this.legs[0].group.rotation.x = -0.9 * lift;
      this.legs[0].lower.rotation.z = -0.2;
    } else if (behavior === "salute") {
      this.legs[0].group.rotation.z = 1.25 * lift;
      this.legs[0].group.rotation.x = -0.8 * lift;
      this.legs[0].lower.rotation.z = 0.72 * lift;
      this.head.rotation.z = -0.12 * lift;
    } else if (behavior === "namaste") {
      this.legs[0].group.rotation.z = 1.48 * lift;
      this.legs[1].group.rotation.z = 1.48 * lift;
      this.legs[0].group.rotation.x = -1.12 * lift;
      this.legs[1].group.rotation.x = 1.12 * lift;
      this.legs[0].lower.rotation.z = -0.62 * lift;
      this.legs[1].lower.rotation.z = -0.62 * lift;
      this.legs[0].group.position.z = 0.18;
      this.legs[1].group.position.z = -0.18;
      this.head.rotation.z = Math.sin(lift * Math.PI) * 0.08;
    }
  }

  private addHairStrand(
    parent: THREE.Object3D,
    root: THREE.Vector3,
    outward: THREE.Vector3,
    length: number,
    material: THREE.Material,
    phase: number,
    movement: number,
  ): void {
    const flowX = -0.28 * 0.58 + outward.x * 0.42;
    const flowY = -0.54 * 0.58 + outward.y * 0.42;
    const flowZ = outward.z * 0.42;
    const flowLen = Math.sqrt(flowX * flowX + flowY * flowY + flowZ * flowZ) || 1;
    const fx = flowX / flowLen;
    const fy = flowY / flowLen;
    const fz = flowZ / flowLen;

    const endX = root.x + fx * length;
    const endY = root.y + fy * length;
    const endZ = root.z + fz * length;

    const midScale = Math.min(0.035, length * 0.16);
    const midX = (root.x + endX) * 0.5 + outward.x * midScale;
    const midY = (root.y + endY) * 0.5 + outward.y * midScale;
    const midZ = (root.z + endZ) * 0.5 + outward.z * midScale;

    let materialBatches = this.hairBatches.get(parent);
    if (!materialBatches) {
      materialBatches = new Map();
      this.hairBatches.set(parent, materialBatches);
    }
    let batch = materialBatches.get(material);
    if (!batch) {
      batch = { positions: [], hairProgress: [], phase, movement };
      materialBatches.set(material, batch);
    }
    batch.movement = Math.max(batch.movement, movement);

    let prevX = root.x;
    let prevY = root.y;
    let prevZ = root.z;

    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const tSq = t * t;
      const oneMinusT = 1 - t;
      const oneMinusTSq = oneMinusT * oneMinusT;
      const twoTOneMinusT = 2 * t * oneMinusT;

      const currX = oneMinusTSq * root.x + twoTOneMinusT * midX + tSq * endX;
      const currY = oneMinusTSq * root.y + twoTOneMinusT * midY + tSq * endY;
      const currZ = oneMinusTSq * root.z + twoTOneMinusT * midZ + tSq * endZ;

      batch.positions.push(prevX, prevY, prevZ, currX, currY, currZ);
      batch.hairProgress.push((i - 1) / 4, t);

      prevX = currX;
      prevY = currY;
      prevZ = currZ;
    }
  }

  private finalizeFur(): void {
    this.hairBatches.forEach((materialBatches, parent) => {
      materialBatches.forEach((batch, sourceMaterial) => {
        const sourceColor =
          sourceMaterial instanceof THREE.MeshStandardMaterial
            ? sourceMaterial.color
            : new THREE.Color(0xe2a04a);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(batch.positions, 3));
        geometry.setAttribute("hairProgress", new THREE.Float32BufferAttribute(batch.hairProgress, 1));

        const lineMaterial = new THREE.LineBasicMaterial({
          color: sourceColor,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        });

        lineMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.uniforms.uGait = { value: 0 };
          lineMaterial.userData.shader = shader;

          shader.vertexShader = `
            attribute float hairProgress;
            uniform float uTime;
            uniform float uGait;
          ` + shader.vertexShader;

          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
            #include <begin_vertex>
            float angleOffset = position.x * 3.0 + position.z * 3.0;
            float timeFreq = uTime * 4.2;
            float primarySway = sin(timeFreq + angleOffset) * 0.012;
            float secondarySway = cos(timeFreq * 0.8 + position.y * 5.0) * 0.006 * (1.0 + uGait * 1.4);
            float totalSwayX = (primarySway + secondarySway) * pow(hairProgress, 1.5);
            float totalSwayZ = (primarySway - secondarySway) * pow(hairProgress, 1.5);
            transformed.x += totalSwayX;
            transformed.z += totalSwayZ;
            transformed.y -= 0.15 * (totalSwayX * totalSwayX + totalSwayZ * totalSwayZ) * hairProgress;
            `
          );
        };

        const lines = new THREE.LineSegments(geometry, lineMaterial);
        const patch = new THREE.Group();
        patch.add(lines);
        parent.add(patch);
        this.furPatches.push({
          group: patch,
          phase: batch.phase,
          amount: batch.movement,
          material: lineMaterial,
        });
      });
    });
    this.hairBatches.clear();
  }

  private addCoatShell(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    scale: THREE.Vector3,
    position: THREE.Vector3,
    color: number,
    opacity: number,
  ): void {
    const alphaMapClone = this.furNoise.clone();
    alphaMapClone.offset.set(Math.random(), Math.random());

    const shell = this.mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
        alphaMap: alphaMapClone,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    shell.scale.copy(scale);
    shell.position.copy(position);
    shell.castShadow = false;
    shell.receiveShadow = false;
    parent.add(shell);
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
