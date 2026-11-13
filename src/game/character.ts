import * as THREE from 'three';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'land'
  | 'death'
  | 'victory';

export class FlutonCatCharacter {
  public readonly root: THREE.Group;
  private readonly bodyPivot: THREE.Group;
  private readonly torsoGroup: THREE.Group;
  private readonly headGroup: THREE.Group;
  private readonly tailPivot: THREE.Group;

  private readonly leftArmPivot: THREE.Group;
  private readonly leftElbowPivot: THREE.Group;
  private readonly rightArmPivot: THREE.Group;
  private readonly rightElbowPivot: THREE.Group;

  private readonly leftLegPivot: THREE.Group;
  private readonly leftKneePivot: THREE.Group;
  private readonly rightLegPivot: THREE.Group;
  private readonly rightKneePivot: THREE.Group;

  private readonly leftEar: THREE.Group;
  private readonly rightEar: THREE.Group;
  private readonly leftEye: THREE.Group;
  private readonly rightEye: THREE.Group;

  private readonly shieldBubble: THREE.Mesh;
  private readonly speedRing: THREE.Mesh;
  private readonly cufflinkTex: THREE.CanvasTexture;

  private animTime = 0;
  private blinkTimer = 2.4;
  private landTimer = 0;
  private coinPulseTimer = 0;
  private facing = 1; // +1 right, -1 left

  constructor(
    foreheadLogoMap: THREE.CanvasTexture,
    furBumpMap?: THREE.CanvasTexture,
  ) {
    this.root = new THREE.Group();
    this.bodyPivot = new THREE.Group();
    this.root.add(this.bodyPivot);

    // Materials with calibrated roughness, fur micro-bump, sheen & metalness contrast
    const furMat = new THREE.MeshPhysicalMaterial({
      color: 0x15171c,
      roughness: 0.68,
      metalness: 0.04,
      sheen: 0.48,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color(0x64748b),
      bumpMap: furBumpMap,
      bumpScale: 0.012,
    });
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      roughness: 0.68,
      metalness: 0.04,
    });
    const suitMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e222b,
      roughness: 0.44,
      metalness: 0.14,
      sheen: 0.58,
      sheenRoughness: 0.48,
      sheenColor: new THREE.Color(0x94a3b8),
      bumpMap: furBumpMap,
      bumpScale: 0.005,
    });
    const lapelMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.45,
      metalness: 0.08,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.02,
    });
    const bowTieMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
    const trimWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.28,
      metalness: 0.15,
    });
    const pawPadMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.65,
      metalness: 0.05,
    });
    const shoeBlackMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.22,
      metalness: 0.25,
      clearcoat: 0.8,
    });
    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.1,
    });
    const eyeScleraMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      emissive: 0x222222,
      emissiveIntensity: 0.15,
    });
    const eyeIrisMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.1,
      metalness: 0.3,
    });
    const eyebrowMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.6,
    });

    // Small cufflink texture reusing forehead logo
    this.cufflinkTex = foreheadLogoMap;
    const cufflinkMat = new THREE.MeshStandardMaterial({
      map: this.cufflinkTex,
      roughness: 0.25,
      metalness: 0.65,
      transparent: true,
    });

    // ========================
    // 1. TORSO (Tuxedo Jacket)
    // ========================
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.88, 0);
    this.bodyPivot.add(this.torsoGroup);

    // Main jacket body
    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.29, 0.56, 18),
      suitMat,
    );
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torsoGroup.add(torsoMesh);

    // Tailcoat lower flare
    const coatSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.34, 0.18, 18, 1, false, Math.PI * 0.25, Math.PI * 1.5),
      suitMat,
    );
    coatSkirt.position.set(0, -0.32, -0.02);
    coatSkirt.castShadow = true;
    this.torsoGroup.add(coatSkirt);

    // White shirt V-front
    const shirtFront = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.36, 4),
      shirtMat,
    );
    shirtFront.rotation.z = Math.PI;
    shirtFront.rotation.y = Math.PI / 4;
    shirtFront.scale.set(1.1, 1, 0.35);
    shirtFront.position.set(0, 0.12, 0.21);
    this.torsoGroup.add(shirtFront);

    // White shirt collar flaps
    [-1, 1].forEach((side) => {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), shirtMat);
      collar.position.set(side * 0.075, 0.27, 0.19);
      collar.rotation.z = -side * 0.38;
      collar.rotation.y = side * 0.2;
      this.torsoGroup.add(collar);

      // Grey tuxedo lapels
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.045), lapelMat);
      lapel.position.set(side * 0.115, 0.11, 0.22);
      lapel.rotation.z = -side * 0.24;
      lapel.rotation.y = side * 0.22;
      this.torsoGroup.add(lapel);
    });

    // Glossy Tuxedo Bow Tie
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0.22, 0.245);
    const bowCenter = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.05), bowTieMat);
    const bowTrim = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.054), trimWhiteMat);
    const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.13, 4), bowTieMat);
    bowLeft.rotation.z = -Math.PI / 2;
    bowLeft.scale.set(1, 1, 0.45);
    bowLeft.position.set(-0.075, 0, 0);
    const bowRight = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.13, 4), bowTieMat);
    bowRight.rotation.z = Math.PI / 2;
    bowRight.scale.set(1, 1, 0.45);
    bowRight.position.set(0.075, 0, 0);
    bowGroup.add(bowCenter, bowTrim, bowLeft, bowRight);
    this.torsoGroup.add(bowGroup);

    // Jacket buttons
    [-0.08, -0.2].forEach((by) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.022, 12), trimWhiteMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, 0.28);
      this.torsoGroup.add(btn);
    });

    // Crisp pocket square trim on left breast pocket
    const pocketSquare = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.055, 3),
      shirtMat,
    );
    pocketSquare.position.set(-0.135, 0.04, 0.245);
    pocketSquare.rotation.z = 0.22;
    pocketSquare.scale.set(1, 1, 0.35);
    this.torsoGroup.add(pocketSquare);

    // ========================
    // 2. SWISHING CAT TAIL
    // ========================
    this.tailPivot = new THREE.Group();
    this.tailPivot.position.set(0, -0.18, -0.24);
    this.torsoGroup.add(this.tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.06, -0.2),
      new THREE.Vector3(0, 0.26, -0.35),
      new THREE.Vector3(0, 0.44, -0.28),
    ]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 16, 0.048, 10, false);
    const tailMesh = new THREE.Mesh(tailGeo, furMat);
    tailMesh.castShadow = true;
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), furMat);
    tailTip.position.set(0, 0.44, -0.28);
    this.tailPivot.add(tailMesh, tailTip);

    // ========================
    // 3. HEAD (Original Mascot Face, Ears, Whiskers & Forehead Fluton Logo)
    // ========================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.34, 0.02);
    this.torsoGroup.add(this.headGroup);

    // Cranium (slightly wide cat silhouette)
    const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 20), furMat);
    headBase.scale.set(1.16, 0.94, 0.98);
    headBase.position.set(0, 0.25, 0);
    headBase.castShadow = true;
    headBase.receiveShadow = true;
    this.headGroup.add(headBase);

    // Spiky cheek fur tufts (3 tufts on each side, faithful to portrait)
    [-1, 1].forEach((side) => {
      [-0.04, 0.04, 0.12].forEach((ty, idx) => {
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), furMat);
        tuft.position.set(side * (0.4 - idx * 0.025), 0.16 + ty, 0.03);
        tuft.rotation.z = -side * (1.25 - idx * 0.18);
        this.headGroup.add(tuft);
      });
    });

    // Pointy Cat Ears with grey scalloped inner fur
    const buildEar = (side: number): THREE.Group => {
      const ear = new THREE.Group();
      ear.position.set(side * 0.23, 0.51, 0.01);
      ear.rotation.z = -side * 0.28;
      ear.rotation.x = 0.08;

      const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.3, 4), furMat);
      outerEar.rotation.y = Math.PI / 4;
      outerEar.scale.set(1.05, 1, 0.65);
      outerEar.position.y = 0.12;
      outerEar.castShadow = true;

      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 4), innerEarMat);
      innerEar.rotation.y = Math.PI / 4;
      innerEar.scale.set(1.0, 1, 0.45);
      innerEar.position.set(0, 0.11, 0.035);

      ear.add(outerEar, innerEar);
      return ear;
    };
    this.leftEar = buildEar(-1);
    this.rightEar = buildEar(1);
    this.headGroup.add(this.leftEar, this.rightEar);

    // Forehead Fluton Logo Emblem (exact match to mascot portrait!)
    const foreheadDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.21),
      new THREE.MeshBasicMaterial({
        map: foreheadLogoMap,
        transparent: true,
        depthWrite: false,
      }),
    );
    foreheadDecal.position.set(0, 0.4, 0.335);
    foreheadDecal.rotation.x = -0.32;
    this.headGroup.add(foreheadDecal);

    // Grey oval eyebrows
    [-1, 1].forEach((side) => {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), eyebrowMat);
      brow.scale.set(1.3, 0.72, 0.45);
      brow.position.set(side * 0.105, 0.355, 0.335);
      brow.rotation.z = -side * 0.25;
      this.headGroup.add(brow);
    });

    // Expressive Cat Eyes (white almond sclera + dark iris + white glint)
    const buildEye = (side: number): THREE.Group => {
      const eye = new THREE.Group();
      eye.position.set(side * 0.145, 0.25, 0.318);
      eye.rotation.y = side * 0.2;

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.074, 16, 14), eyeScleraMat);
      sclera.scale.set(1.22, 0.82, 0.45);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), eyeIrisMat);
      iris.scale.set(1.0, 1.0, 0.55);
      iris.position.set(-side * 0.008, 0, 0.025);

      const glint = new THREE.Mesh(
        new THREE.TorusGeometry(0.021, 0.007, 8, 16, Math.PI * 1.45),
        trimWhiteMat,
      );
      glint.position.set(-side * 0.008, 0.003, 0.046);
      glint.rotation.z = 0.6;

      eye.add(sclera, iris, glint);
      return eye;
    };
    this.leftEye = buildEye(-1);
    this.rightEye = buildEye(1);
    this.headGroup.add(this.leftEye, this.rightEye);

    // Nose & Cute ':3' Mouth
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.034, 3), eyeIrisMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.z = Math.PI;
    nose.position.set(0, 0.175, 0.36);
    this.headGroup.add(nose);

    [-1, 1].forEach((side) => {
      const smileArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.008, 8, 14, Math.PI * 0.9),
        eyebrowMat,
      );
      smileArc.position.set(side * 0.034, 0.14, 0.352);
      smileArc.rotation.z = Math.PI + side * 0.15;
      this.headGroup.add(smileArc);

      // 3 Whiskers per cheek
      [-0.02, 0.02, 0.06].forEach((wy, idx) => {
        const whisker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.004, 0.003, 0.24, 6),
          eyebrowMat,
        );
        whisker.rotation.z = Math.PI / 2 + side * (idx - 1) * 0.14;
        whisker.position.set(side * 0.32, 0.15 + wy, 0.24);
        this.headGroup.add(whisker);
      });
    });

    // ========================
    // 4. TWO ARTICULATED ARMS (Sleeves, White Cuffs, Fluton Cufflinks, 3D Hands with Fingers & Paw Pads)
    // ========================
    const buildArm = (side: number): { shoulder: THREE.Group; elbow: THREE.Group } => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.27, 0.2, 0.0);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.065, 0.24, 12),
        suitMat,
      );
      upperArm.position.y = -0.11;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.22, 0);
      shoulder.add(elbow);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.076, 0.2, 12),
        suitMat,
      );
      forearm.position.y = -0.09;
      forearm.castShadow = true;
      elbow.add(forearm);

      // White shirt cuff
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12),
        shirtMat,
      );
      cuff.position.y = -0.2;
      elbow.add(cuff);

      // Fluton cufflink badge on sleeve
      const cufflink = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12),
        cufflinkMat,
      );
      cufflink.rotation.z = Math.PI / 2;
      cufflink.position.set(side * 0.072, -0.16, 0.02);
      elbow.add(cufflink);

      // 3D Hand with Palm, Paw Pad, 4 Fingers & Thumb
      const hand = new THREE.Group();
      hand.position.set(0, -0.26, 0);
      elbow.add(hand);

      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), furMat);
      palm.scale.set(1.05, 1.0, 0.72);
      palm.castShadow = true;
      hand.add(palm);

      // Central grey paw pad on palm front
      const mainPad = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), pawPadMat);
      mainPad.scale.set(1.15, 0.9, 0.4);
      mainPad.position.set(0, -0.008, 0.045);
      hand.add(mainPad);

      // 4 Distinct Fingers with tiny paw pads
      [-0.048, -0.016, 0.016, 0.048].forEach((fx, idx) => {
        const fingerLen = idx === 1 || idx === 2 ? 0.075 : 0.062;
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.016, fingerLen * 0.55, 6, 8),
          furMat,
        );
        finger.position.set(fx, -0.065 - (idx === 1 || idx === 2 ? 0.008 : 0), 0.005);
        finger.rotation.z = fx * 2.2;
        finger.castShadow = true;
        hand.add(finger);

        const toePad = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), pawPadMat);
        toePad.scale.set(1, 1, 0.45);
        toePad.position.set(fx * 1.08, -0.078, 0.02);
        hand.add(toePad);
      });

      // Distinct Thumb
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.045, 6, 8), furMat);
      thumb.position.set(-side * 0.068, -0.015, 0.022);
      thumb.rotation.z = side * 0.75;
      hand.add(thumb);

      return { shoulder, elbow };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);
    this.leftArmPivot = leftArm.shoulder;
    this.leftElbowPivot = leftArm.elbow;
    this.rightArmPivot = rightArm.shoulder;
    this.rightElbowPivot = rightArm.elbow;
    this.torsoGroup.add(this.leftArmPivot, this.rightArmPivot);

    // ========================
    // 5. TWO ARTICULATED LEGS (Trousers, Knees, Feet & Two-Tone Shoes)
    // ========================
    const buildLeg = (side: number): { hip: THREE.Group; knee: THREE.Group } => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.135, 0.62, 0);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.082, 0.28, 12),
        suitMat,
      );
      thigh.position.y = -0.14;
      thigh.castShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.28, 0);
      hip.add(knee);

      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.072, 0.24, 12),
        suitMat,
      );
      shin.position.y = -0.12;
      shin.castShadow = true;
      knee.add(shin);

      // 3D Foot & Stylish Black/White Tuxedo Shoe (bottom sits cleanly at local y = -0.34)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.27, 0.045);
      knee.add(shoeGroup);

      // Shoe upper
      const shoeUpper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.09, 0.24),
        shoeBlackMat,
      );
      shoeUpper.position.set(0, 0.01, 0.02);
      shoeUpper.castShadow = true;
      shoeGroup.add(shoeUpper);

      // Rounded white toe cap
      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 12, 10),
        trimWhiteMat,
      );
      toeCap.scale.set(0.95, 0.65, 1.15);
      toeCap.position.set(0, -0.005, 0.12);
      toeCap.castShadow = true;
      shoeGroup.add(toeCap);

      // Crisp white shoe sole
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.035, 0.28),
        shoeSoleMat,
      );
      sole.position.set(0, -0.052, 0.035);
      sole.castShadow = true;
      shoeGroup.add(sole);

      return { hip, knee };
    };

    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);
    this.leftLegPivot = leftLeg.hip;
    this.leftKneePivot = leftLeg.knee;
    this.rightLegPivot = rightLeg.hip;
    this.rightKneePivot = rightLeg.knee;
    this.bodyPivot.add(this.leftLegPivot, this.rightLegPivot);

    // ========================
    // 6. POWER-UP VISUALS (Shield Bubble & Speed Aura)
    // ========================
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 24, 18),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.shieldBubble.position.set(0, 0.95, 0);
    this.shieldBubble.visible = false;
    this.root.add(this.shieldBubble);

    this.speedRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.035, 10, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.75,
      }),
    );
    this.speedRing.rotation.x = Math.PI / 2;
    this.speedRing.position.set(0, 0.08, 0);
    this.speedRing.visible = false;
    this.root.add(this.speedRing);
  }

  public triggerLanding(): void {
    this.landTimer = 0.26;
  }

  public triggerCoinCollect(): void {
    this.coinPulseTimer = 0.28;
  }

  public setFacing(dir: number): void {
    if (dir !== 0) {
      this.facing = dir > 0 ? 1 : -1;
    }
  }

  public update(
    dt: number,
    state: CharacterAnimState,
    speedRatio: number,
    options: { shieldActive: boolean; speedActive: boolean; jumpBoostActive: boolean; vy?: number },
  ): void {
    this.animTime += dt;
    if (this.landTimer > 0) this.landTimer = Math.max(0, this.landTimer - dt);
    if (this.coinPulseTimer > 0) this.coinPulseTimer = Math.max(0, this.coinPulseTimer - dt);

    // Smooth facing yaw rotation (side-scroller: +1 faces right (+X), -1 faces left (-X))
    // Default character faces +Z; +Math.PI/2 faces +X, -Math.PI/2 faces -X
    const targetYaw =
      state === 'victory'
        ? this.animTime * 4.5 // Spin during victory dance!
        : state === 'idle'
          ? this.facing * (Math.PI * 0.36) // Slight 3/4 turn toward camera in idle so face shines
          : this.facing * (Math.PI * 0.48);

    if (state === 'victory') {
      this.bodyPivot.rotation.y = targetYaw;
    } else {
      this.bodyPivot.rotation.y = THREE.MathUtils.damp(
        this.bodyPivot.rotation.y,
        targetYaw,
        14,
        dt,
      );
    }

    // Eye blinking
    this.blinkTimer -= dt;
    let eyeScaleY = 1;
    if (this.blinkTimer <= 0) {
      if (this.blinkTimer > -0.12) {
        eyeScaleY = 0.12;
      } else {
        this.blinkTimer = 2.2 + Math.random() * 2.5;
      }
    }
    this.leftEye.scale.y = state === 'death' ? 0.25 : eyeScaleY;
    this.rightEye.scale.y = state === 'death' ? 0.25 : eyeScaleY;

    // Power-up visuals
    this.shieldBubble.visible = options.shieldActive;
    if (options.shieldActive) {
      this.shieldBubble.rotation.y += dt * 1.8;
      const pulse = 1 + Math.sin(this.animTime * 6) * 0.04;
      this.shieldBubble.scale.setScalar(pulse);
    }
    this.speedRing.visible = options.speedActive || options.jumpBoostActive;
    if (this.speedRing.visible) {
      const mat = this.speedRing.material as THREE.MeshBasicMaterial;
      mat.color.setHex(options.speedActive ? 0xfbbf24 : 0x38bdf8);
      this.speedRing.rotation.z += dt * 5;
      this.speedRing.scale.setScalar(0.95 + Math.sin(this.animTime * 9) * 0.12);
    }

    // Reset default target pose values
    let bodyY = 0;
    let bodyTiltX = 0;
    let torsoTwistY = 0;
    let scaleX = 1;
    let scaleY = 1;

    let lArmX = 0;
    let lArmZ = 0.14;
    let lElbowX = -0.15;
    let rArmX = 0;
    let rArmZ = -0.14;
    let rElbowX = -0.15;

    let lLegX = 0;
    let lKneeX = 0;
    let rLegX = 0;
    let rKneeX = 0;

    let headTiltX = 0;
    let headTiltZ = 0;

    if (state === 'idle') {
      const breathe = Math.sin(this.animTime * 2.6);
      bodyY = breathe * 0.025;
      lArmZ = 0.16 + breathe * 0.03;
      rArmZ = -0.16 - breathe * 0.03;
      // Periodic friendly paw wave on left arm (like reference mascot!)
      const waveCycle = (this.animTime % 4.5);
      if (waveCycle > 2.8) {
        const w = Math.sin((waveCycle - 2.8) * 10);
        rArmZ = -2.35 + w * 0.22;
        rElbowX = -0.5;
      }
      headTiltZ = Math.sin(this.animTime * 1.4) * 0.05;
    } else if (state === 'walk' || state === 'run') {
      const isRun = state === 'run';
      const freq = isRun ? 15.8 : 10.2;
      const stride = isRun ? 0.98 : 0.64;
      const phase = this.animTime * freq;
      const swing = Math.sin(phase) * stride * Math.max(0.4, speedRatio);

      bodyY = Math.abs(Math.cos(phase)) * (isRun ? 0.12 : 0.055);
      bodyTiltX = isRun ? 0.27 : 0.11;
      torsoTwistY = Math.sin(phase) * (isRun ? 0.14 : 0.07);

      lLegX = swing;
      rLegX = -swing;
      lKneeX = Math.max(0, -Math.cos(phase)) * (isRun ? 1.02 : 0.58);
      rKneeX = Math.max(0, Math.cos(phase)) * (isRun ? 1.02 : 0.58);

      lArmX = -swing * 0.92;
      rArmX = swing * 0.92;
      lArmZ = isRun ? 0.22 : 0.18;
      rArmZ = isRun ? -0.22 : -0.18;
      lElbowX = isRun ? -1.2 : -0.48;
      rElbowX = isRun ? -1.2 : -0.48;
      headTiltX = isRun ? -0.1 : -0.03;
    } else if (state === 'jump') {
      const vy = options.vy ?? 5;
      const riseBlend = THREE.MathUtils.clamp((vy + 4) / 14, 0, 1);
      bodyTiltX = THREE.MathUtils.lerp(0.08, -0.08, riseBlend);
      lArmZ = THREE.MathUtils.lerp(1.65, 2.5, riseBlend);
      rArmZ = THREE.MathUtils.lerp(-1.65, -2.5, riseBlend);
      lArmX = THREE.MathUtils.lerp(0.2, -0.38, riseBlend);
      rArmX = THREE.MathUtils.lerp(0.2, -0.38, riseBlend);
      lElbowX = THREE.MathUtils.lerp(-0.3, -0.55, riseBlend);
      rElbowX = THREE.MathUtils.lerp(-0.3, -0.55, riseBlend);
      lLegX = THREE.MathUtils.lerp(-0.22, -0.6, riseBlend);
      lKneeX = THREE.MathUtils.lerp(0.45, 0.92, riseBlend);
      rLegX = THREE.MathUtils.lerp(0.18, 0.36, riseBlend);
      rKneeX = THREE.MathUtils.lerp(0.25, 0.32, riseBlend);
      scaleX = THREE.MathUtils.lerp(0.98, 0.92, riseBlend);
      scaleY = THREE.MathUtils.lerp(1.02, 1.09, riseBlend);
      headTiltX = THREE.MathUtils.lerp(0.06, -0.14, riseBlend);
    } else if (state === 'death') {
      bodyTiltX = Math.PI * 0.45;
      this.bodyPivot.rotation.z = this.animTime * 7.5;
      lArmZ = 2.2;
      rArmZ = -2.2;
      lLegX = -0.5;
      rLegX = 0.5;
    } else if (state === 'victory') {
      const dance = this.animTime * 9.5;
      bodyY = Math.abs(Math.sin(dance)) * 0.26;
      lArmZ = 2.2 + Math.sin(dance) * 0.45;
      rArmZ = -2.2 - Math.cos(dance) * 0.45;
      lElbowX = -0.4;
      rElbowX = -0.4;
      lLegX = Math.sin(dance) * 0.35;
      rLegX = -Math.sin(dance) * 0.35;
      headTiltZ = Math.sin(dance * 0.5) * 0.14;
    }

    if (state !== 'death') {
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(this.bodyPivot.rotation.z, 0, 14, dt);
    }

    // Cushioned knee-bend & squash-and-stretch landing rebound
    if (this.landTimer > 0 && state !== 'jump' && state !== 'death') {
      const k = Math.sin((this.landTimer / 0.26) * Math.PI);
      scaleY *= 1 - k * 0.22;
      scaleX *= 1 + k * 0.16;
      bodyY -= k * 0.1;
      bodyTiltX += k * 0.14;
      lLegX -= k * 0.24;
      rLegX -= k * 0.24;
      lKneeX += k * 0.48;
      rKneeX += k * 0.48;
    }

    // Coin collection perk-up overlay
    if (this.coinPulseTimer > 0) {
      const p = Math.sin((this.coinPulseTimer / 0.28) * Math.PI);
      headTiltX -= p * 0.2;
      this.leftEar.rotation.x = 0.08 + p * 0.3;
      this.rightEar.rotation.x = 0.08 + p * 0.3;
    } else {
      this.leftEar.rotation.x = THREE.MathUtils.damp(this.leftEar.rotation.x, 0.08, 12, dt);
      this.rightEar.rotation.x = THREE.MathUtils.damp(this.rightEar.rotation.x, 0.08, 12, dt);
    }

    // Apply smoothed transforms
    const dampRate = 18;
    this.bodyPivot.position.y = THREE.MathUtils.damp(this.bodyPivot.position.y, bodyY, dampRate, dt);
    this.bodyPivot.scale.x = THREE.MathUtils.damp(this.bodyPivot.scale.x, scaleX, dampRate, dt);
    this.bodyPivot.scale.z = this.bodyPivot.scale.x;
    this.bodyPivot.scale.y = THREE.MathUtils.damp(this.bodyPivot.scale.y, scaleY, dampRate, dt);

    this.torsoGroup.rotation.x = THREE.MathUtils.damp(
      this.torsoGroup.rotation.x,
      bodyTiltX,
      dampRate,
      dt,
    );
    this.torsoGroup.rotation.y = THREE.MathUtils.damp(
      this.torsoGroup.rotation.y,
      torsoTwistY,
      dampRate,
      dt,
    );
    this.headGroup.rotation.x = THREE.MathUtils.damp(
      this.headGroup.rotation.x,
      headTiltX,
      dampRate,
      dt,
    );
    this.headGroup.rotation.z = THREE.MathUtils.damp(
      this.headGroup.rotation.z,
      headTiltZ,
      dampRate,
      dt,
    );

    // Tail dynamic swish
    const tailFreq = state === 'run' ? 11 : 4.2;
    this.tailPivot.rotation.y = Math.sin(this.animTime * tailFreq) * 0.42;
    this.tailPivot.rotation.x = state === 'run' ? -0.35 : 0.1 + Math.cos(this.animTime * 3) * 0.1;

    this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, lArmX, dampRate, dt);
    this.leftArmPivot.rotation.z = THREE.MathUtils.damp(this.leftArmPivot.rotation.z, lArmZ, dampRate, dt);
    this.leftElbowPivot.rotation.x = THREE.MathUtils.damp(this.leftElbowPivot.rotation.x, lElbowX, dampRate, dt);

    this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, rArmX, dampRate, dt);
    this.rightArmPivot.rotation.z = THREE.MathUtils.damp(this.rightArmPivot.rotation.z, rArmZ, dampRate, dt);
    this.rightElbowPivot.rotation.x = THREE.MathUtils.damp(this.rightElbowPivot.rotation.x, rElbowX, dampRate, dt);

    this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, lLegX, dampRate, dt);
    this.leftKneePivot.rotation.x = THREE.MathUtils.damp(this.leftKneePivot.rotation.x, lKneeX, dampRate, dt);
    this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, rLegX, dampRate, dt);
    this.rightKneePivot.rotation.x = THREE.MathUtils.damp(this.rightKneePivot.rotation.x, rKneeX, dampRate, dt);
  }
}
