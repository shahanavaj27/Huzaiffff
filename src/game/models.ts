import * as THREE from 'three';
import { GameTextureSet } from './textures';
import { BiomeId, EnemyType, PowerUpType } from './types';

/**
 * Scales BoxGeometry UVs per face according to world dimensions so tiled
 * textures remain crisp and never stretch across wide platforms.
 */
export function createTiledBoxGeometry(
  w: number,
  h: number,
  d: number,
  tileUnit = 3.0,
  clampVertical = false,
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // Preserve normalized [0..1] face UVs on channel 1 (uv1) for per-face Ambient Occlusion
  geo.setAttribute('uv1', uv.clone());
  const norm = geo.attributes.normal;

  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const u = uv.getX(i);
    const v = uv.getY(i);

    if (nx > 0.5) {
      // +X / -X faces (depth x height)
      uv.setXY(i, u * Math.max(1, d / tileUnit), clampVertical ? v : v * Math.max(1, h / tileUnit));
    } else if (ny > 0.5) {
      // +Y / -Y faces (width x depth)
      uv.setXY(i, u * Math.max(1, w / tileUnit), v * Math.max(1, d / tileUnit));
    } else {
      // +Z / -Z front & back faces (width x height)
      uv.setXY(i, u * Math.max(1, w / tileUnit), clampVertical ? v : v * Math.max(1, h / tileUnit));
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function createSkyGradientDome(
  topHex: string,
  bottomHex: string,
  isNight = false,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(195, 24, 18);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(topHex) },
      uBottomColor: { value: new THREE.Color(bottomHex) },
      uIsNight: { value: isNight ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      void main() {
        vLocalPos = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIsNight;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        float h = clamp((vWorldPos.y + 18.0) / 96.0, 0.0, 1.0);
        vec3 midColor = mix(uBottomColor, uTopColor, 0.45);
        vec3 col = mix(uBottomColor, midColor, smoothstep(0.0, 0.36, h));
        col = mix(col, uTopColor, smoothstep(0.32, 1.0, h));

        // Soft luminous horizon band for atmospheric depth
        float horizonGlow = exp(-abs(vWorldPos.y - 2.0) * 0.055) * (1.0 - uIsNight * 0.55);
        col += mix(uBottomColor, vec3(1.0, 0.96, 0.86), 0.38) * horizonGlow * 0.24;

        // Subtle crisp starfield for night / volcanic twilight worlds
        if (uIsNight > 0.5 && h > 0.18) {
          vec3 dir = normalize(vLocalPos);
          vec2 grid = floor(vec2(atan(dir.z, dir.x) * 28.0, dir.y * 52.0));
          float n = hash21(grid);
          if (n > 0.986) {
            col += vec3(0.85, 0.92, 1.0) * smoothstep(0.18, 0.55, h) * 0.75;
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

export interface CoinSharedKit {
  rimGeo: THREE.TorusGeometry;
  bevelGeo: THREE.TorusGeometry;
  edgeGeo: THREE.CylinderGeometry;
  faceGeo: THREE.CircleGeometry;
  haloGeo: THREE.PlaneGeometry;
  rimMatStd: THREE.MeshPhysicalMaterial;
  rimMatGlow: THREE.MeshPhysicalMaterial;
  edgeMat: THREE.MeshStandardMaterial;
  faceMatStd: THREE.MeshStandardMaterial;
  faceMatGlow: THREE.MeshStandardMaterial;
  haloMatStd: THREE.MeshBasicMaterial;
  haloMatGlow: THREE.MeshBasicMaterial;
}

export function createCoinSharedKit(textures: GameTextureSet): CoinSharedKit {
  return {
    rimGeo: new THREE.TorusGeometry(0.46, 0.062, 12, 32),
    bevelGeo: new THREE.TorusGeometry(0.415, 0.022, 8, 32),
    edgeGeo: new THREE.CylinderGeometry(0.455, 0.455, 0.094, 32, 1, true),
    faceGeo: new THREE.CircleGeometry(0.435, 32),
    haloGeo: new THREE.PlaneGeometry(1.52, 1.52),
    rimMatStd: new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0x334155,
      emissiveIntensity: 0.14,
      metalness: 0.96,
      roughness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.45,
    }),
    rimMatGlow: new THREE.MeshPhysicalMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      metalness: 0.96,
      roughness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.5,
    }),
    edgeMat: new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 1.35,
    }),
    faceMatStd: new THREE.MeshStandardMaterial({
      map: textures.coinFaceMap,
      bumpMap: textures.coinBumpMap,
      bumpScale: 0.038,
      metalness: 0.56,
      roughness: 0.2,
      envMapIntensity: 1.3,
    }),
    faceMatGlow: new THREE.MeshStandardMaterial({
      map: textures.coinFaceMap,
      bumpMap: textures.coinBumpMap,
      bumpScale: 0.038,
      metalness: 0.62,
      roughness: 0.18,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.26,
      envMapIntensity: 1.35,
    }),
    haloMatStd: new THREE.MeshBasicMaterial({
      map: textures.glowHaloMap,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    haloMatGlow: new THREE.MeshBasicMaterial({
      map: textures.glowHaloMap,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}

export function createFlutonCoinMesh(
  textures: GameTextureSet,
  strongGlow = false,
  shared?: CoinSharedKit,
): THREE.Group {
  const coin = new THREE.Group();
  const kit = shared ?? createCoinSharedKit(textures);

  const rimMat = strongGlow ? kit.rimMatGlow : kit.rimMatStd;
  const rim = new THREE.Mesh(kit.rimGeo, rimMat);
  rim.castShadow = true;
  coin.add(rim);

  // Subtle double-bevel inner rings on front & back for luxury minted coin rim
  const bevelFront = new THREE.Mesh(kit.bevelGeo, rimMat);
  bevelFront.position.z = 0.036;
  const bevelBack = new THREE.Mesh(kit.bevelGeo, rimMat);
  bevelBack.position.z = -0.036;
  coin.add(bevelFront, bevelBack);

  const edge = new THREE.Mesh(kit.edgeGeo, kit.edgeMat);
  edge.rotation.x = Math.PI / 2;
  coin.add(edge);

  // Front & back exact Fluton logo medallion faces
  const faceMat = strongGlow ? kit.faceMatGlow : kit.faceMatStd;
  const frontFace = new THREE.Mesh(kit.faceGeo, faceMat);
  frontFace.position.z = 0.048;
  const backFace = new THREE.Mesh(kit.faceGeo, faceMat);
  backFace.position.z = -0.048;
  backFace.rotation.y = Math.PI;
  coin.add(frontFace, backFace);

  // Soft radiant halo sprite plane behind coin
  const halo = new THREE.Mesh(kit.haloGeo, strongGlow ? kit.haloMatGlow : kit.haloMatStd);
  coin.add(halo);

  return coin;
}

export function createMysteryBoxMesh(textures: GameTextureSet): {
  group: THREE.Group;
  mainMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({
    map: textures.mysteryBoxMap,
    roughness: 0.32,
    metalness: 0.18,
  });

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.12, 1.12), mainMat);
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  const studMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.78,
    roughness: 0.24,
  });
  const s = 0.52;
  [
    [-s, -s, s],
    [s, -s, s],
    [-s, s, s],
    [s, s, s],
    [-s, -s, -s],
    [s, -s, -s],
    [-s, s, -s],
    [s, s, -s],
  ].forEach(([x, y, z]) => {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), studMat);
    stud.position.set(x, y, z);
    group.add(stud);
  });

  return { group, mainMat };
}

export interface CalloutSparkle {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  driftX: number;
  driftY: number;
  phase: number;
  spinSpeed: number;
  baseScale: number;
}

export function createMysteryCalloutMesh(
  textures: GameTextureSet,
  textGeo: THREE.PlaneGeometry,
  sparkleGeo: THREE.PlaneGeometry,
): {
  group: THREE.Group;
  textMat: THREE.MeshBasicMaterial;
  sparkleMat: THREE.MeshBasicMaterial;
  sparkles: CalloutSparkle[];
} {
  const group = new THREE.Group();

  const textMat = new THREE.MeshBasicMaterial({
    map: textures.gflutonTextMap,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.renderOrder = 25;
  group.add(textMesh);

  const sparkleMat = new THREE.MeshBasicMaterial({
    map: textures.sparkleStarMap,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const offsets: [number, number, number, number][] = [
    [-1.48, 0.44, 0.12, 1.1],
    [1.52, 0.42, 0.12, 1.15],
    [-1.22, -0.42, 0.1, 0.85],
    [1.28, -0.4, 0.1, 0.9],
    [-0.52, 0.56, 0.14, 0.95],
    [0.58, 0.58, 0.14, 1.0],
    [-1.76, 0.02, 0.08, 0.78],
    [1.78, 0.04, 0.08, 0.82],
  ];

  const sparkles: CalloutSparkle[] = offsets.map(([bx, by, bz, baseScale], idx) => {
    const mesh = new THREE.Mesh(sparkleGeo, sparkleMat);
    mesh.position.set(bx, by, bz);
    mesh.scale.setScalar(baseScale);
    mesh.renderOrder = 26;
    group.add(mesh);
    return {
      mesh,
      baseX: bx,
      baseY: by,
      baseZ: bz,
      driftX: Math.sign(bx || 1) * (0.28 + (idx % 3) * 0.12),
      driftY: (by >= 0 ? 0.35 : 0.15) + (idx % 2) * 0.15,
      phase: idx * 0.85,
      spinSpeed: (idx % 2 === 0 ? 1 : -1) * (2.6 + (idx % 3) * 0.8),
      baseScale,
    };
  });

  return { group, textMat, sparkleMat, sparkles };
}

export function createPowerUpMesh(type: PowerUpType): THREE.Group {
  const group = new THREE.Group();

  if (type === 'speed') {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        metalness: 0.7,
        roughness: 0.18,
      }),
    );
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.25,
      metalness: 0.3,
    });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), wingMat);
    wingL.position.set(-0.36, 0.08, 0);
    wingL.rotation.z = 0.35;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), wingMat);
    wingR.position.set(0.36, 0.08, 0);
    wingR.rotation.z = -0.35;
    group.add(core, wingL, wingR);
  } else if (type === 'jump') {
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      metalness: 0.65,
      roughness: 0.2,
    });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), starMat);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        metalness: 0.85,
        roughness: 0.15,
      }),
    );
    ring.rotation.x = Math.PI / 3;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x38bdf8, emissiveIntensity: 0.4 }),
    );
    arrow.position.y = 0.48;
    group.add(orb, ring, arrow);
  } else if (type === 'shield') {
    const gem = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.38, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0x22d3ee,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        roughness: 0.12,
        metalness: 0.25,
        clearcoat: 1.0,
      }),
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.055, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        metalness: 0.85,
        roughness: 0.15,
      }),
    );
    group.add(gem, halo);
  } else {
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xbe123c,
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.35,
    });
    const leftLobe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), heartMat);
    leftLobe.position.set(-0.15, 0.12, 0);
    const rightLobe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), heartMat);
    rightLobe.position.set(0.15, 0.12, 0);
    const bottomCone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.45, 14), heartMat);
    bottomCone.rotation.z = Math.PI;
    bottomCone.position.set(0, -0.1, 0);
    const goldBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.045, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.18 }),
    );
    group.add(leftLobe, rightLobe, bottomCone, goldBand);
  }

  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  return group;
}

export function createEnemyMesh(
  type: EnemyType,
  biome: BiomeId = 'green_hills',
): {
  group: THREE.Group;
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
  footL?: THREE.Mesh;
  footR?: THREE.Mesh;
} {
  const group = new THREE.Group();
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });

  const isDarkOrLava = biome === 'dark_forest' || biome === 'lava';
  const walkerCapColor =
    biome === 'desert'
      ? 0xb45309
      : biome === 'snow'
        ? 0x0284c7
        : biome === 'dark_forest'
          ? 0x6d28d9
          : biome === 'lava'
            ? 0xb91c1c
            : 0xd97706;

  if (type === 'walker') {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.44, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.68 }),
    );
    stem.position.y = 0.32;
    stem.castShadow = true;
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({
        color: walkerCapColor,
        roughness: 0.45,
        emissive: isDarkOrLava ? walkerCapColor : 0x000000,
        emissiveIntensity: isDarkOrLava ? 0.25 : 0,
      }),
    );
    cap.position.y = 0.5;
    cap.castShadow = true;
    group.add(cap);

    const spotMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.6 });
    [
      [0.24, 0.78, 0.2],
      [-0.26, 0.74, 0.18],
      [0, 0.88, -0.15],
    ].forEach(([sx, sy, sz]) => {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), spotMat);
      spot.position.set(sx, sy, sz);
      group.add(spot);
    });

    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), eyeWhite);
      eye.position.set(ex, 0.4, 0.28);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMat);
      pupil.position.set(ex, 0.4, 0.34);
      group.add(eye, pupil);
    });

    const footMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const footL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), footMat);
    footL.scale.set(1, 0.6, 1.3);
    footL.position.set(-0.18, 0.08, 0.04);
    const footR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), footMat);
    footR.scale.set(1, 0.6, 1.3);
    footR.position.set(0.18, 0.08, 0.04);
    group.add(footL, footR);

    return { group, footL, footR };
  }

  if (type === 'spiky') {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.32, metalness: 0.3 }),
    );
    shell.position.y = 0.22;
    shell.castShadow = true;
    group.add(shell);

    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.44, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }),
    );
    belly.position.y = 0.18;
    group.add(belly);

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    [
      [0, 0.82, 0, 0],
      [-0.28, 0.68, 0.14, 0.45],
      [0.28, 0.68, 0.14, -0.45],
      [0, 0.68, -0.28, 0],
    ].forEach(([sx, sy, sz, rz]) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), spikeMat);
      spike.position.set(sx, sy, sz);
      spike.rotation.z = rz;
      spike.castShadow = true;
      group.add(spike);
    });

    const glowEyeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.7,
    });
    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glowEyeMat);
      eye.position.set(ex, 0.28, 0.44);
      group.add(eye);
    });

    const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.24), footMat);
    footL.position.set(-0.24, 0.06, 0);
    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.24), footMat);
    footR.position.set(0.24, 0.06, 0);
    group.add(footL, footR);

    return { group, footL, footR };
  }

  if (type === 'flyer') {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.3, 8, 14),
      new THREE.MeshStandardMaterial({
        color: biome === 'lava' ? 0xea580c : 0x7c3aed,
        roughness: 0.38,
        metalness: 0.22,
      }),
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
    );
    stripe.rotation.z = Math.PI / 2;
    stripe.position.y = 0.5;
    group.add(stripe);

    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), eyeWhite);
      eye.position.set(ex, 0.54, 0.28);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMat);
      pupil.position.set(ex, 0.54, 0.34);
      group.add(eye, pupil);
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.2,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
    const wingGeo = new THREE.PlaneGeometry(0.55, 0.32);
    wingGeo.translate(0.27, 0, 0);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(0.05, 0.76, -0.1);
    wingL.rotation.y = Math.PI * 0.65;
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(-0.05, 0.76, -0.1);
    wingR.rotation.y = Math.PI * 0.35;
    group.add(wingL, wingR);

    return { group, wingL, wingR };
  }

  // 'hopper': Spring-loaded Bouncer Bot
  const spring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 }),
  );
  spring.position.y = 0.16;
  group.add(spring);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.58, 0.64),
    new THREE.MeshStandardMaterial({
      color: biome === 'desert' ? 0xd97706 : biome === 'kingdom' ? 0xf59e0b : 0x0284c7,
      roughness: 0.32,
      metalness: 0.35,
    }),
  );
  head.position.y = 0.58;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.18, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.7,
    }),
  );
  visor.position.set(0, 0.62, 0.31);
  group.add(visor);

  return { group };
}

export function createBossMesh(textures: GameTextureSet): {
  group: THREE.Group;
  crown: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  bodyMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    metalness: 0.68,
    roughness: 0.28,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    metalness: 0.45,
    roughness: 0.42,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.9,
    roughness: 0.18,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 1.1,
    roughness: 0.15,
  });

  // Heavy robotic legs
  [-0.55, 0.55].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.85, 12), armorMat);
    leg.position.set(lx, 0.45, 0);
    leg.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.72), goldMat);
    boot.position.set(lx, 0.14, 0.08);
    boot.castShadow = true;
    group.add(leg, boot);
  });

  // Broad armored torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.78, 1.45, 16), bodyMat);
  torso.position.y = 1.55;
  torso.castShadow = true;
  group.add(torso);

  // Chest crest emblem
  const chestPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20), goldMat);
  chestPlate.rotation.x = Math.PI / 2;
  chestPlate.position.set(0, 1.58, 0.82);
  group.add(chestPlate);

  const chestLogo = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 20),
    new THREE.MeshBasicMaterial({ map: textures.foreheadLogoMap, transparent: true }),
  );
  chestLogo.position.set(0, 1.58, 0.89);
  group.add(chestLogo);

  // Shoulder pauldrons
  [-1.08, 1.08].forEach((sx) => {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), goldMat);
    pauldron.position.set(sx, 2.08, 0);
    pauldron.castShadow = true;
    group.add(pauldron);
  });

  // Articulated heavy gauntlets
  const buildBossArm = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.12, 1.98, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.9, 12), armorMat);
    arm.position.y = -0.45;
    arm.castShadow = true;
    const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), goldMat);
    fist.position.y = -0.95;
    fist.castShadow = true;
    pivot.add(arm, fist);
    return pivot;
  };
  const armL = buildBossArm(-1);
  const armR = buildBossArm(1);
  group.add(armL, armR);

  // Armored Helm & Glowing Visor
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 16), armorMat);
  head.position.set(0, 2.65, 0);
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.3), visorMat);
  visor.position.set(0, 2.68, 0.52);
  group.add(visor);

  // Royal Spiked Crown (stompable top target!)
  const crown = new THREE.Group();
  crown.position.set(0, 3.22, 0);
  const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.26, 16), goldMat);
  crown.add(crownBand);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 8), goldMat);
    spike.position.set(Math.cos(a) * 0.44, 0.26, Math.sin(a) * 0.44);
    crown.add(spike);
  }
  const weakGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      metalness: 0.4,
      roughness: 0.1,
    }),
  );
  weakGem.position.y = 0.32;
  crown.add(weakGem);
  group.add(crown);

  return { group, crown, armL, armR, visorMat, bodyMat };
}

export function createCactusHazardMesh(height = 1.6): THREE.Group {
  const group = new THREE.Group();
  const cactusMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.65,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    roughness: 0.4,
  });

  const trunk = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, Math.max(0.4, height - 0.5), 8, 12),
    cactusMat,
  );
  trunk.position.y = height * 0.5;
  trunk.castShadow = true;
  group.add(trunk);

  // Side arms
  [-1, 1].forEach((side, i) => {
    const armY = height * (0.45 + i * 0.15);
    const elbow = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.26, 6, 8), cactusMat);
    elbow.rotation.z = side * (Math.PI * 0.45);
    elbow.position.set(side * 0.32, armY, 0);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 6, 8), cactusMat);
    tip.position.set(side * 0.46, armY + 0.2, 0);
    elbow.castShadow = true;
    tip.castShadow = true;
    group.add(elbow, tip);
  });

  // Sharp warning spines
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), spineMat);
    sp.position.set(Math.cos(a) * 0.27, height * 0.68, Math.sin(a) * 0.27);
    sp.rotation.z = -Math.cos(a) * 1.4;
    sp.rotation.x = Math.sin(a) * 1.4;
    group.add(sp);
  }

  return group;
}

export function createFireGeyserMesh(): {
  group: THREE.Group;
  plume: THREE.Group;
} {
  const group = new THREE.Group();

  const vent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.68, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 }),
  );
  vent.position.y = 0.275;
  vent.castShadow = true;
  group.add(vent);

  const magmaCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 12),
    new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  );
  magmaCore.rotation.x = -Math.PI / 2;
  magmaCore.position.y = 0.56;
  group.add(magmaCore);

  const plume = new THREE.Group();
  plume.position.y = 0.55;
  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 2.5, 10),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
    }),
  );
  outerFlame.position.y = 1.25;
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 1.9, 10),
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  );
  innerFlame.position.y = 0.95;
  plume.add(outerFlame, innerFlame);
  group.add(plume);

  return { group, plume };
}

export function createWaterfallMesh(
  w: number,
  h: number,
  textures: GameTextureSet,
  isLava = false,
): THREE.Group {
  const group = new THREE.Group();

  const streamMat = new THREE.MeshStandardMaterial({
    map: isLava ? textures.lavaMap : textures.waterfallMap,
    color: isLava ? 0xf97316 : 0x7dd3fc,
    emissive: isLava ? 0xea580c : 0x0284c7,
    emissiveIntensity: isLava ? 0.65 : 0.28,
    roughness: 0.2,
    transparent: !isLava,
    opacity: isLava ? 0.96 : 0.86,
  });

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), streamMat);
  sheet.position.y = 0;
  group.add(sheet);

  // Top stone cliff lip & bottom splash foam torus
  const cliffMat = new THREE.MeshStandardMaterial({
    color: isLava ? 0x292524 : 0x475569,
    roughness: 0.88,
  });
  const topLip = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.7, 1.4), cliffMat);
  topLip.position.set(0, h * 0.5, -0.35);
  group.add(topLip);

  const foamMat = new THREE.MeshBasicMaterial({
    color: isLava ? 0xfef08a : 0xf0f9ff,
    transparent: true,
    opacity: 0.82,
  });
  const splash = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.56, w * 0.65, 0.36, 14), foamMat);
  splash.position.set(0, -h * 0.5 + 0.18, 0.15);
  group.add(splash);

  return group;
}

export function createCheckpointMesh(textures: GameTextureSet): {
  group: THREE.Group;
  flag: THREE.Mesh;
  beaconMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.4 }),
  );
  base.position.y = 0.175;
  base.castShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 3.0, 12),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }),
  );
  pole.position.y = 1.65;
  pole.castShadow = true;
  group.add(pole);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), beaconMat);
  beacon.position.y = 3.25;
  group.add(beacon);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.62, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      map: textures.foreheadLogoMap,
      roughness: 0.45,
    }),
  );
  flag.position.set(0.55, 1.35, 0);
  flag.castShadow = true;
  group.add(flag);

  return { group, flag, beaconMat };
}

export function createPipeMesh(isEntrance: boolean): THREE.Group {
  const group = new THREE.Group();
  const pipeMat = new THREE.MeshStandardMaterial({
    color: isEntrance ? 0x16a34a : 0x0284c7,
    roughness: 0.26,
    metalness: 0.22,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: isEntrance ? 0x22c55e : 0x38bdf8,
    roughness: 0.2,
    metalness: 0.28,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.78, 1.4, 24), pipeMat);
  shaft.position.y = 0.7;
  shaft.castShadow = true;
  shaft.receiveShadow = true;

  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.42, 24), rimMat);
  lip.position.y = 1.45;
  lip.castShadow = true;
  lip.receiveShadow = true;

  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.05, 20),
    new THREE.MeshBasicMaterial({ color: 0x020617 }),
  );
  hole.position.y = 1.65;

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.045, 8, 24),
    new THREE.MeshBasicMaterial({ color: isEntrance ? 0xfbbf24 : 0x7dd3fc }),
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 1.68;

  group.add(shaft, lip, hole, glowRing);
  return group;
}

export function createFinishGateMesh(textures: GameTextureSet): {
  group: THREE.Group;
  crest: THREE.Group;
  lockBarrier: THREE.Mesh;
} {
  const group = new THREE.Group();

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.32,
    metalness: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.88,
    roughness: 0.18,
  });

  [-2.05, 2.05].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.15), goldMat);
    plinth.position.set(px, 0.325, 0);
    plinth.castShadow = true;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.4, 16), pillarMat);
    col.position.set(px, 2.5, 0);
    col.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 16), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px, 3.6, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), goldMat);
    cap.position.set(px, 4.85, 0);
    group.add(plinth, col, ring, cap);
  });

  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.92, 0.36),
    new THREE.MeshStandardMaterial({
      map: textures.checkerBannerMap,
      roughness: 0.38,
    }),
  );
  banner.position.set(0, 4.2, 0);
  banner.castShadow = true;
  group.add(banner);

  // Energy barrier shown only while Level 10 Boss is still alive
  const lockBarrier = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.6),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  lockBarrier.position.set(0, 1.9, 0);
  lockBarrier.visible = false;
  group.add(lockBarrier);

  const crest = createFlutonCoinMesh(textures, true);
  crest.scale.setScalar(1.85);
  crest.position.set(0, 5.6, 0);
  group.add(crest);

  return { group, crest, lockBarrier };
}

export function createTreeMesh(
  biome: BiomeId,
  scale = 1,
  contactShadowMap?: THREE.Texture,
): THREE.Group {
  const tree = new THREE.Group();

  if (contactShadowMap) {
    const aoShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({
        map: contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.44,
      }),
    );
    aoShadow.rotation.x = -Math.PI / 2;
    aoShadow.position.y = 0.02;
    tree.add(aoShadow);
  }

  if (biome === 'desert') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 2.4, 8, 12), trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    tree.add(trunk);

    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.25, 10), ribMat);
    baseCollar.position.y = 0.125;
    tree.add(baseCollar);

    [-1, 1].forEach((side, i) => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.75, 6, 8), trunkMat);
      arm.position.set(side * 0.45, 1.55 + i * 0.35, 0);
      arm.rotation.z = side * 0.42;
      arm.castShadow = true;
      tree.add(arm);
    });

    const blossom = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.45 }),
    );
    blossom.position.set(0, 2.88, 0);
    tree.add(blossom);

    tree.scale.setScalar(scale);
    return tree;
  }

  if (biome === 'snow' || biome === 'mountain') {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3416, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 1.55, 10), barkMat);
    trunk.position.y = 0.775;
    trunk.castShadow = true;
    tree.add(trunk);

    const rootFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.26, 10), barkMat);
    rootFlare.position.y = 0.13;
    tree.add(rootFlare);

    const pineColor = biome === 'snow' ? 0x0f766e : 0x15803d;
    const pineDeep = biome === 'snow' ? 0x115e59 : 0x14532d;
    const pineMat = new THREE.MeshStandardMaterial({ color: pineColor, roughness: 0.76 });
    const pineDeepMat = new THREE.MeshStandardMaterial({ color: pineDeep, roughness: 0.84 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });

    [0, 1, 2, 3].forEach((tier) => {
      const r = 1.42 - tier * 0.26;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, 1.32, 10),
        tier % 2 === 0 ? pineDeepMat : pineMat,
      );
      cone.position.y = 1.55 + tier * 0.72;
      cone.rotation.y = tier * 0.35;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);

      if (biome === 'snow') {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.64, 0.48, 10), snowMat);
        cap.position.y = 1.96 + tier * 0.72;
        cap.rotation.y = tier * 0.35;
        tree.add(cap);
      }
    });
    tree.scale.setScalar(scale);
    return tree;
  }

  // Lush Multi-Branch Leafy Tree with Root Flare & 3-Tone Foliage Canopy
  const barkColor =
    biome === 'dark_forest' ? 0x27272a : biome === 'lava' ? 0x44403c : 0x7c4a21;
  const trunkMat = new THREE.MeshStandardMaterial({ color: barkColor, roughness: 0.92 });

  const rootFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 0.34, 10), trunkMat);
  rootFlare.position.y = 0.17;
  tree.add(rootFlare);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.42, 2.55, 10), trunkMat);
  trunk.position.y = 1.32;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  [-1, 1].forEach((side) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.12, 8), trunkMat);
    branch.position.set(side * 0.38, 2.05, 0);
    branch.rotation.z = -side * 0.55;
    tree.add(branch);
  });

  const leafColors: [number, number, number] =
    biome === 'dark_forest'
      ? [0x1e1b4b, 0x312e81, 0x5b21b6]
      : biome === 'lava'
        ? [0x57534e, 0x7c2d12, 0xb45309]
        : biome === 'kingdom'
          ? [0x15803d, 0x22c55e, 0xfbbf24]
          : biome === 'sky'
            ? [0x059669, 0x10b981, 0x6ee7b7]
            : [0x14532d, 0x16a34a, 0x4ade80];

  const leafMatDark = new THREE.MeshStandardMaterial({
    color: leafColors[0],
    roughness: 0.82,
    emissive: biome === 'dark_forest' ? 0x2e1065 : 0x000000,
    emissiveIntensity: biome === 'dark_forest' ? 0.22 : 0,
  });
  const leafMatMid = new THREE.MeshStandardMaterial({
    color: leafColors[1],
    roughness: 0.7,
    emissive: biome === 'dark_forest' ? 0x3b0764 : 0x000000,
    emissiveIntensity: biome === 'dark_forest' ? 0.24 : 0,
  });
  const leafMatTop = new THREE.MeshStandardMaterial({
    color: leafColors[2],
    roughness: 0.62,
  });

  const puffs: [number, number, number, number, THREE.MeshStandardMaterial][] = [
    [-0.75, 2.6, 0.12, 0.86, leafMatDark],
    [0.75, 2.64, -0.1, 0.88, leafMatDark],
    [0, 2.68, -0.58, 0.82, leafMatDark],
    [0, 3.16, 0, 1.15, leafMatMid],
    [0, 2.74, 0.62, 0.78, leafMatMid],
    [0.26, 3.62, -0.1, 0.76, leafMatTop],
    [-0.36, 3.45, 0.24, 0.68, leafMatTop],
  ];
  puffs.forEach(([px, py, pz, r, mat]) => {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    leaf.position.set(px, py, pz);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    tree.add(leaf);
  });

  tree.scale.setScalar(scale);
  return tree;
}

export function createBushMesh(
  biome: BiomeId,
  scale = 1,
  contactShadowMap?: THREE.Texture,
): THREE.Group {
  const bush = new THREE.Group();
  const baseColor =
    biome === 'snow'
      ? 0xcbd5e1
      : biome === 'desert'
        ? 0xa16207
        : biome === 'dark_forest'
          ? 0x3b0764
          : biome === 'lava'
            ? 0x44403c
            : 0x15803d;
  const topColor =
    biome === 'snow'
      ? 0xf8fafc
      : biome === 'desert'
        ? 0xd97706
        : biome === 'dark_forest'
          ? 0x5b21b6
          : biome === 'lava'
            ? 0x78716c
            : 0x22c55e;

  if (contactShadowMap) {
    const aoShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.4),
      new THREE.MeshBasicMaterial({
        map: contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.38,
      }),
    );
    aoShadow.rotation.x = -Math.PI / 2;
    aoShadow.position.y = 0.02;
    bush.add(aoShadow);
  }

  const matBase = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.82 });
  const matTop = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.72 });

  const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), matTop);
  b1.position.set(0, 0.44, 0);
  const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), matBase);
  b2.position.set(0.44, 0.32, 0.1);
  const b3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.43, 1), matBase);
  b3.position.set(-0.44, 0.3, -0.05);
  const b4 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), matTop);
  b4.position.set(0.1, 0.62, 0.22);
  bush.add(b1, b2, b3, b4);

  if (biome === 'green_hills' || biome === 'forest' || biome === 'kingdom') {
    const berryMat = new THREE.MeshStandardMaterial({
      color: biome === 'kingdom' ? 0xfbbf24 : 0xf472b6,
      roughness: 0.4,
    });
    [
      [-0.22, 0.54, 0.44],
      [0.24, 0.46, 0.46],
      [0.04, 0.76, 0.34],
    ].forEach(([bx, by, bz]) => {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), berryMat);
      berry.position.set(bx, by, bz);
      bush.add(berry);
    });
  }

  bush.scale.setScalar(scale);
  return bush;
}

export function createCloudMesh(scale = 1, tintHex = 0xffffff): THREE.Group {
  const cloud = new THREE.Group();
  const matTop = new THREE.MeshStandardMaterial({
    color: tintHex,
    roughness: 0.84,
    emissive: tintHex,
    emissiveIntensity: 0.16,
  });
  const underTint = new THREE.Color(tintHex).lerp(new THREE.Color(0x94a3b8), 0.24);
  const matUnder = new THREE.MeshStandardMaterial({
    color: underTint,
    roughness: 0.92,
  });
  [
    [0, 0.08, 0, 1.18, matTop],
    [-1.02, -0.14, 0.1, 0.86, matUnder],
    [1.02, -0.14, -0.1, 0.85, matUnder],
    [0.36, 0.48, 0.04, 0.82, matTop],
    [-0.38, 0.4, 0.08, 0.72, matTop],
    [0, -0.22, 0.12, 0.92, matUnder],
  ].forEach(([cx, cy, cz, r, mat]) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(r as number, 14, 12),
      mat as THREE.MeshStandardMaterial,
    );
    puff.position.set(cx as number, cy as number, cz as number);
    cloud.add(puff);
  });
  cloud.scale.setScalar(scale);
  return cloud;
}
