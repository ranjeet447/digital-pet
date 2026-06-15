import * as THREE from "three";

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

export class ThreePetRenderer {
  private readonly baseFur = createBaseFurTexture();
  private readonly furNoise = createFurNoiseTexture();
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
  private lastTime = 0;
  private earVelocity: [number, number] = [0, 0];
  private leftEarSway = -0.15;
  private rightEarSway = 0.15;
  private readonly balls: THREE.Mesh[] = [];
  private readonly fetchBall: THREE.Mesh;
  private readonly foodBowl = new THREE.Group();
  private readonly treat: THREE.Mesh;
  private readonly golden = new THREE.MeshStandardMaterial({
    color: 0xd69345,
    roughness: 0.96,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.008,
  });
  private readonly lightGolden = new THREE.MeshStandardMaterial({
    color: 0xeeb462,
    roughness: 0.96,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.008,
  });
  private readonly cream = new THREE.MeshStandardMaterial({
    color: 0xf6dba1,
    roughness: 0.98,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.006,
  });
  private readonly darkGolden = new THREE.MeshStandardMaterial({
    color: 0xa4622b,
    roughness: 0.96,
    metalness: 0,
    map: this.baseFur,
    bumpMap: this.furNoise,
    bumpScale: 0.01,
  });
  private readonly black = new THREE.MeshStandardMaterial({
    color: 0x11100f,
    roughness: 0.38,
    metalness: 0.05,
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
    this.camera.lookAt(0.1, 0.72, 0);

    const hemisphere = new THREE.HemisphereLight(0xffe8c2, 0x5f412e, 2.15);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff1d6, 4.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -2;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xf5ae62, 1.7);
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
    this.buildFur();
    this.finalizeFur();
    this.tongue = this.buildMouth();
    this.fetchBall = this.buildBalls();
    this.treat = this.buildCareProps();
  }

  render(frame: ThreePetFrame): void {
    this.resetPose();

    const dt = this.lastTime === 0 ? 0.016 : Math.min(0.1, frame.time - this.lastTime);
    this.lastTime = frame.time;

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

    this.applyBehavior(frame);
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(220, 180, false);
  }

  dispose(): void {
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.renderer.dispose();
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

    const nose = this.mesh(new THREE.SphereGeometry(0.2, 28, 18), this.black);
    nose.scale.set(0.82, 0.62, 1.04);
    nose.position.set(0.38, 0.06, 0);
    this.muzzle.add(nose);

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2417,
      roughness: 0.28,
      metalness: 0.02,
    });
    for (const z of [-0.255, 0.255]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.094, 22, 16), irisMaterial);
      eye.scale.set(0.9, 1.04, 1);
      eye.position.set(0.43, 0.18, z);
      this.head.add(eye);
      const pupil = this.mesh(new THREE.SphereGeometry(0.054, 18, 12), this.black);
      pupil.position.set(0.5, 0.18, z + (z < 0 ? -0.01 : 0.01));
      this.head.add(pupil);
      const shine = this.mesh(
        new THREE.SphereGeometry(0.019, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      shine.position.set(0.545, 0.22, z + (z < 0 ? -0.025 : 0.025));
      this.head.add(shine);
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

    const paw = this.mesh(new THREE.SphereGeometry(0.21, 22, 14), this.lightGolden);
    paw.scale.set(1.34, 0.56, 1.16);
    paw.position.set(0.11, -0.42, 0);
    lower.add(paw);

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
      case "roll-over":
        this.root.position.y = -0.26 + Math.sin(p * Math.PI) * 0.18;
        this.root.rotation.x = Math.sin(p * Math.PI) * Math.PI;
        this.legs.forEach((leg, index) => {
          leg.group.rotation.z = (index % 2 ? -1 : 1) * Math.sin(p * Math.PI) * 0.92;
        });
        this.tongue.visible = p > 0.25 && p < 0.75;
        break;
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
      case "surprise":
        this.root.rotation.y += p * Math.PI * 2;
        this.root.position.y += Math.sin(p * Math.PI) * 0.6;
        this.legs.forEach((leg, index) => {
          leg.group.rotation.z = (index % 2 ? -1 : 1) * Math.sin(p * Math.PI * 4) * 0.5;
        });
        this.tongue.visible = true;
        break;
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
