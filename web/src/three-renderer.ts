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

export class ThreePetRenderer {
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
    Map<THREE.Material, { positions: number[]; phase: number; movement: number }>
  >();
  private readonly furPatches: Array<{
    group: THREE.Group;
    phase: number;
    amount: number;
  }> = [];
  private readonly ears: [THREE.Mesh, THREE.Mesh];
  private readonly legs: [LegRig, LegRig, LegRig, LegRig];
  private readonly balls: THREE.Mesh[] = [];
  private readonly fetchBall: THREE.Mesh;
  private readonly foodBowl = new THREE.Group();
  private readonly treat: THREE.Mesh;
  private readonly golden = new THREE.MeshStandardMaterial({
    color: 0xc87528,
    roughness: 0.83,
    metalness: 0,
  });
  private readonly lightGolden = new THREE.MeshStandardMaterial({
    color: 0xe8a743,
    roughness: 0.88,
    metalness: 0,
  });
  private readonly cream = new THREE.MeshStandardMaterial({
    color: 0xf3cf83,
    roughness: 0.92,
    metalness: 0,
  });
  private readonly darkGolden = new THREE.MeshStandardMaterial({
    color: 0x754019,
    roughness: 0.9,
    metalness: 0,
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
    this.furPatches.forEach(({ group, phase, amount }) => {
      const movement = gaitSpeed > 0 ? gait * amount : Math.sin(frame.time * 2.2 + phase) * amount * 0.28;
      group.rotation.z = movement;
      group.rotation.x = Math.cos(frame.time * 1.7 + phase) * amount * 0.18;
    });
    this.ears[0].rotation.x = -0.1 + Math.abs(gait) * 0.13;
    this.ears[1].rotation.x = -0.1 - Math.abs(gait) * 0.13;

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
    torso.scale.set(1.42, 0.73, 0.72);
    torso.position.y = 0.92;
    this.body.add(torso);

    const shoulder = this.mesh(new THREE.SphereGeometry(0.64, 32, 20), this.lightGolden);
    shoulder.scale.set(0.76, 1.02, 0.86);
    shoulder.position.set(0.76, 1.04, 0);
    this.body.add(shoulder);

    const backShade = this.mesh(
      new THREE.SphereGeometry(0.72, 28, 18),
      new THREE.MeshStandardMaterial({ color: 0x9a501d, roughness: 0.94 }),
    );
    backShade.scale.set(1.3, 0.16, 0.72);
    backShade.position.set(-0.18, 1.42, 0);
    this.body.add(backShade);
  }

  private buildFur(): void {
    const furMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6a34a,
      roughness: 1,
      metalness: 0,
    });
    const creamFur = new THREE.MeshStandardMaterial({
      color: 0xf4ce80,
      roughness: 1,
      metalness: 0,
    });

    this.addCoatShell(
      this.body,
      new THREE.SphereGeometry(0.92, 36, 24),
      new THREE.Vector3(1.445, 0.755, 0.745),
      new THREE.Vector3(0, 0.92, 0),
      0xd9923c,
      0.24,
    );
    this.addCoatShell(
      this.body,
      new THREE.SphereGeometry(0.64, 32, 20),
      new THREE.Vector3(0.79, 1.055, 0.9),
      new THREE.Vector3(0.76, 1.04, 0),
      0xefa94a,
      0.2,
    );
    this.addCoatShell(
      this.head,
      new THREE.SphereGeometry(0.57, 36, 24),
      new THREE.Vector3(0.925, 1.05, 0.95),
      new THREE.Vector3(),
      0xdd9138,
      0.22,
    );

    for (let row = 0; row < 12; row += 1) {
      for (let column = 0; column < 14; column += 1) {
        const angle = (column / 14) * Math.PI * 2;
        const side = Math.sin(angle);
        const vertical = Math.cos(angle);
        const xProgress = row / 11;
        const bodyRadius = Math.sin(xProgress * Math.PI) * 0.12;
        const root = new THREE.Vector3(
          -1.02 + row * 0.185,
          0.94 + vertical * (0.44 + bodyRadius * 0.25),
          side * (0.58 + bodyRadius),
        );
        const outward = new THREE.Vector3(
          (xProgress - 0.5) * 0.18,
          vertical,
          side,
        ).normalize();
        this.addHairStrand(
          this.body,
          root,
          outward,
          0.075 + ((row + column) % 4) * 0.012,
          column % 7 === 0 ? creamFur : furMaterial,
          row * 0.7 + column,
          0.006,
        );
      }
    }

    for (let latitude = 0; latitude < 7; latitude += 1) {
      for (let longitude = 0; longitude < 12; longitude += 1) {
        const phi = ((latitude + 0.5) / 7) * Math.PI;
        const theta = (longitude / 12) * Math.PI * 2;
        const outward = new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi),
          Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
        ).normalize();
        const root = new THREE.Vector3(
          outward.x * 0.46,
          outward.y * 0.53,
          outward.z * 0.43,
        );
        this.addHairStrand(
          this.head,
          root,
          outward,
          0.06 + ((latitude + longitude) % 3) * 0.012,
          longitude % 6 === 0 ? creamFur : furMaterial,
          latitude * 12 + longitude,
          0.004,
        );
      }
    }

    for (let index = 0; index < 42; index += 1) {
      const ring = Math.floor(index / 7);
      const angle = ((index % 7) / 7) * Math.PI * 2;
      const root = new THREE.Vector3(
        0.48 + ring * 0.075,
        0.56 + Math.cos(angle) * (0.31 + ring * 0.018),
        Math.sin(angle) * (0.43 + ring * 0.012),
      );
      const outward = new THREE.Vector3(0.38, Math.cos(angle) - 0.24, Math.sin(angle)).normalize();
      this.addHairStrand(
        this.body,
        root,
        outward,
        0.21 + (index % 5) * 0.025,
        index % 3 === 0 ? creamFur : furMaterial,
        index,
        0.012,
      );
    }

    for (let index = 0; index < 36; index += 1) {
      const side = index % 2 ? -1 : 1;
      const row = Math.floor(index / 2);
      const root = new THREE.Vector3(
        -0.72 + (row % 9) * 0.17,
        0.56 + Math.floor(row / 9) * 0.18,
        side * (0.52 + (row % 3) * 0.018),
      );
      const outward = new THREE.Vector3(-0.1, -0.3, side).normalize();
      this.addHairStrand(
        this.body,
        root,
        outward,
        0.2 + (index % 5) * 0.024,
        index % 3 === 0 ? creamFur : furMaterial,
        index * 0.8,
        0.014,
      );
    }

    for (const side of [-1, 1]) {
      for (let index = 0; index < 18; index += 1) {
        const row = Math.floor(index / 6);
        const across = (index % 6) / 5;
        this.addHairStrand(
          this.head,
          new THREE.Vector3(-0.22 + row * 0.06, 0.18 - row * 0.16, side * (0.48 + across * 0.055)),
          new THREE.Vector3(-0.1, -0.82, side * 0.18).normalize(),
          0.16 + across * 0.09,
          index % 4 === 0 ? creamFur : furMaterial,
          index + side * 3,
          0.012,
        );
      }
    }

    for (const leg of this.legs) {
      this.addCoatShell(
        leg.group,
        new THREE.CylinderGeometry(0.19, 0.17, 0.59, 18),
        new THREE.Vector3(1.04, 1.02, 1.04),
        new THREE.Vector3(0, -0.28, 0),
        0xd9903b,
        0.2,
      );
      for (let index = 0; index < 16; index += 1) {
        const side = index % 2 ? -1 : 1;
        const row = Math.floor(index / 2);
        this.addHairStrand(
          leg.group,
          new THREE.Vector3(0.02, -0.04 - row * 0.062, side * 0.17),
          new THREE.Vector3(0.08, -0.76, side * 0.2).normalize(),
          0.1 + (index % 4) * 0.015,
          index % 5 === 0 ? creamFur : furMaterial,
          index,
          0.007,
        );
      }

      for (let index = 0; index < 10; index += 1) {
        const side = index % 2 ? -1 : 1;
        const root = new THREE.Vector3(0, -0.08 - Math.floor(index / 2) * 0.045, side * 0.14);
        const outward = new THREE.Vector3(0.16, -0.62, side).normalize();
        this.addHairStrand(
          leg.lower,
          root,
          outward,
          0.15 + (index % 4) * 0.025,
          creamFur,
          index,
          0.012,
        );
      }
    }
  }

  private buildHead(): [THREE.Mesh, THREE.Mesh] {
    this.head.position.set(1.18, 1.43, 0);
    this.body.add(this.head);

    const skull = this.mesh(new THREE.SphereGeometry(0.57, 36, 24), this.golden);
    skull.scale.set(0.9, 1.02, 0.92);
    this.head.add(skull);

    const forehead = this.mesh(new THREE.SphereGeometry(0.4, 28, 20), this.lightGolden);
    forehead.scale.set(0.72, 0.78, 0.82);
    forehead.position.set(0.14, 0.18, 0);
    this.head.add(forehead);

    this.muzzle.position.set(0.46, -0.08, 0);
    this.head.add(this.muzzle);
    const muzzleShape = this.mesh(new THREE.SphereGeometry(0.36, 32, 20), this.cream);
    muzzleShape.scale.set(1.06, 0.66, 0.82);
    this.muzzle.add(muzzleShape);

    const nose = this.mesh(new THREE.SphereGeometry(0.18, 28, 18), this.black);
    nose.scale.set(0.72, 0.62, 0.88);
    nose.position.set(0.29, 0.07, 0);
    this.muzzle.add(nose);

    for (const z of [-0.3, 0.3]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.075, 22, 16), this.black);
      eye.position.set(0.37, 0.22, z);
      this.head.add(eye);
      const shine = this.mesh(
        new THREE.SphereGeometry(0.019, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      shine.position.set(0.43, 0.265, z + (z < 0 ? -0.045 : 0.045));
      this.head.add(shine);
    }

    const leftEar = this.mesh(new THREE.SphereGeometry(0.42, 24, 16), this.darkGolden);
    leftEar.scale.set(0.38, 1.2, 0.56);
    leftEar.position.set(-0.15, -0.07, 0.49);
    leftEar.rotation.x = -0.1;
    this.head.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.z = -0.49;
    this.head.add(rightEar);

    const collar = this.mesh(
      new THREE.TorusGeometry(0.48, 0.045, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0xb92125, roughness: 0.62 }),
    );
    collar.rotation.y = Math.PI / 2;
    collar.position.set(-0.35, -0.35, 0);
    this.head.add(collar);

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

    const upper = this.mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.58, 18), this.golden);
    upper.position.y = -0.28;
    group.add(upper);

    const lower = new THREE.Group();
    lower.position.y = -0.55;
    group.add(lower);

    const shin = this.mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.42, 18), this.lightGolden);
    shin.position.y = -0.18;
    lower.add(shin);

    const paw = this.mesh(new THREE.SphereGeometry(0.2, 22, 14), this.lightGolden);
    paw.scale.set(1.18, 0.55, 1.08);
    paw.position.set(0.09, -0.42, 0);
    lower.add(paw);

    return { group, lower, paw };
  }

  private buildTail(): void {
    this.tail.position.set(-1.23, 1.04, 0);
    this.tail.rotation.x = Math.PI / 2;
    this.body.add(this.tail);
    let parent = this.tail;
    for (let index = 0; index < 5; index += 1) {
      const segment = this.mesh(new THREE.CylinderGeometry(0.15 - index * 0.018, 0.13 - index * 0.018, 0.48, 14), this.golden);
      segment.rotation.x = Math.PI / 2;
      segment.position.z = -0.22;
      parent.add(segment);
      for (let feather = 0; feather < 8; feather += 1) {
        const angle = (feather / 8) * Math.PI * 2;
        const root = new THREE.Vector3(Math.sin(angle) * 0.12, Math.cos(angle) * 0.12, -0.18);
        const outward = new THREE.Vector3(Math.sin(angle), Math.cos(angle), -0.32).normalize();
        this.addHairStrand(
          parent,
          root,
          outward,
          0.2 + index * 0.018,
          feather % 3 === 0 ? this.cream : this.lightGolden,
          index * 9 + feather,
          0.018,
        );
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
    this.head.position.set(1.18, 1.43, 0);
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
    const flow = new THREE.Vector3(-0.2, -0.76, outward.z * 0.2)
      .addScaledVector(outward, 0.18)
      .normalize();
    const end = root.clone().addScaledVector(flow, length);
    const middle = root
      .clone()
      .lerp(end, 0.52)
      .addScaledVector(outward, Math.min(0.035, length * 0.16));
    const curve = new THREE.QuadraticBezierCurve3(root, middle, end);
    const points = curve.getPoints(4);
    let materialBatches = this.hairBatches.get(parent);
    if (!materialBatches) {
      materialBatches = new Map();
      this.hairBatches.set(parent, materialBatches);
    }
    let batch = materialBatches.get(material);
    if (!batch) {
      batch = { positions: [], phase, movement };
      materialBatches.set(material, batch);
    }
    batch.movement = Math.max(batch.movement, movement);
    for (let index = 0; index < points.length - 1; index += 1) {
      batch.positions.push(
        points[index].x,
        points[index].y,
        points[index].z,
        points[index + 1].x,
        points[index + 1].y,
        points[index + 1].z,
      );
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
        const lines = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: sourceColor,
            transparent: true,
            opacity: 0.58,
            depthWrite: false,
          }),
        );
        const patch = new THREE.Group();
        patch.add(lines);
        parent.add(patch);
        this.furPatches.push({
          group: patch,
          phase: batch.phase,
          amount: batch.movement,
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
    const shell = this.mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
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
