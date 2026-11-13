import * as THREE from 'three';

export interface GameTextureSet {
  coinFaceMap: THREE.CanvasTexture;
  coinBumpMap: THREE.CanvasTexture;
  foreheadLogoMap: THREE.CanvasTexture;
  grassTopMap: THREE.CanvasTexture;
  dirtSideMap: THREE.CanvasTexture;
  stoneMap: THREE.CanvasTexture;
  woodPlankMap: THREE.CanvasTexture;
  brickMap: THREE.CanvasTexture;
  sandMap: THREE.CanvasTexture;
  iceMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  castleMap: THREE.CanvasTexture;
  lavaMap: THREE.CanvasTexture;
  mysteryBoxMap: THREE.CanvasTexture;
  usedBoxMap: THREE.CanvasTexture;
  undergroundWallMap: THREE.CanvasTexture;
  checkerBannerMap: THREE.CanvasTexture;
  waterMap: THREE.CanvasTexture;
  waterfallMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  glowHaloMap: THREE.CanvasTexture;
  gflutonTextMap: THREE.CanvasTexture;
  sparkleStarMap: THREE.CanvasTexture;
  terrainBumpMap: THREE.CanvasTexture;
  furBumpMap: THREE.CanvasTexture;
  aoEdgeMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Draws the exact Fluton circular logo symbol from the reference image:
 * - Upper inverted-V chevron
 * - Lower-left angled L-chevron
 * - Lower-right diagonally split ring
 */
export function drawFlutonSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  symbolColor: string,
  cutoutColor: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  const strokeW = radius * 0.165;
  ctx.strokeStyle = symbolColor;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Top inverted-V chevron
  ctx.beginPath();
  ctx.moveTo(-radius * 0.5, -radius * 0.02);
  ctx.lineTo(0, -radius * 0.52);
  ctx.lineTo(radius * 0.5, -radius * 0.02);
  ctx.stroke();

  // 2. Bottom-left chevron pointing down-left
  ctx.beginPath();
  ctx.moveTo(0.0, -radius * 0.19);
  ctx.lineTo(-radius * 0.28, radius * 0.1);
  ctx.lineTo(0.0, radius * 0.42);
  ctx.stroke();

  // 3. Bottom-right notched ring
  const ringCx = radius * 0.21;
  const ringCy = radius * 0.12;
  const ringOuter = radius * 0.165;
  const ringInner = radius * 0.068;

  ctx.fillStyle = symbolColor;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringOuter, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle cutout
  ctx.fillStyle = cutoutColor;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringInner, 0, Math.PI * 2);
  ctx.fill();

  // Diagonal notch across the ring (bottom-left to top-right)
  ctx.strokeStyle = cutoutColor;
  ctx.lineWidth = radius * 0.042;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(ringCx - ringOuter * 1.15, ringCy + ringOuter * 1.15);
  ctx.lineTo(ringCx + ringOuter * 1.15, ringCy - ringOuter * 1.15);
  ctx.stroke();

  ctx.restore();
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeat = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createGameTextures(maxAniso: number): GameTextureSet {
  // 1. Coin Face Texture (exact uploaded Fluton logo coin + metallic sheen rim)
  const [coinCanvas, coinCtx] = makeCanvas(512, 512);
  const renderVectorCoin = () => {
    const grad = coinCtx.createRadialGradient(210, 180, 20, 256, 256, 256);
    grad.addColorStop(0, '#27272a');
    grad.addColorStop(0.75, '#09090b');
    grad.addColorStop(1, '#020617');
    coinCtx.fillStyle = grad;
    coinCtx.fillRect(0, 0, 512, 512);

    coinCtx.strokeStyle = '#f1f5f9';
    coinCtx.lineWidth = 14;
    coinCtx.beginPath();
    coinCtx.arc(256, 256, 232, 0, Math.PI * 2);
    coinCtx.stroke();

    drawFlutonSymbol(coinCtx, 256, 260, 200, '#f8fafc', '#09090b');
  };
  renderVectorCoin();

  const coinFaceMap = finalizeColorTexture(coinCanvas, maxAniso);

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      coinCtx.save();
      coinCtx.beginPath();
      coinCtx.arc(256, 256, 240, 0, Math.PI * 2);
      coinCtx.clip();
      coinCtx.drawImage(img, 12, 12, 488, 488);
      coinCtx.restore();
      coinCtx.strokeStyle = '#f8fafc';
      coinCtx.lineWidth = 10;
      coinCtx.beginPath();
      coinCtx.arc(256, 256, 242, 0, Math.PI * 2);
      coinCtx.stroke();
      coinFaceMap.needsUpdate = true;
    };
    img.src = '/assets/aistudio/Screenshot_2026_1111_225251_8e263dc4.png';
  }

  // 2. Coin Bump Map (linear space for embossed 3D relief)
  const [bumpCanvas, bumpCtx] = makeCanvas(512, 512);
  bumpCtx.fillStyle = '#303030';
  bumpCtx.fillRect(0, 0, 512, 512);
  bumpCtx.strokeStyle = '#ffffff';
  bumpCtx.lineWidth = 18;
  bumpCtx.beginPath();
  bumpCtx.arc(256, 256, 234, 0, Math.PI * 2);
  bumpCtx.stroke();
  drawFlutonSymbol(bumpCtx, 256, 260, 200, '#ffffff', '#303030');
  const coinBumpMap = new THREE.CanvasTexture(bumpCanvas);
  coinBumpMap.anisotropy = maxAniso;
  coinBumpMap.needsUpdate = true;

  // 3. Forehead Fluton Logo Decal
  const [fhCanvas, fhCtx] = makeCanvas(256, 256);
  fhCtx.clearRect(0, 0, 256, 256);
  drawFlutonSymbol(fhCtx, 128, 128, 108, '#f8fafc', '#18181b');
  const foreheadLogoMap = finalizeColorTexture(fhCanvas, maxAniso);

  // 4. High-Detail Grass Top Texture (512x512 lush turf, clover flecks, wildflower specks & soft edge shading)
  const [grassCanvas, grassCtx] = makeCanvas(512, 512);
  const grassGrad = grassCtx.createLinearGradient(0, 0, 512, 512);
  grassGrad.addColorStop(0, '#38b349');
  grassGrad.addColorStop(0.5, '#3cb043');
  grassGrad.addColorStop(1, '#2fa33c');
  grassCtx.fillStyle = grassGrad;
  grassCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 3.5 + Math.random() * 9.5;
    grassCtx.fillStyle =
      i % 5 === 0
        ? '#74f082'
        : i % 4 === 0
          ? '#4ade80'
          : i % 3 === 0
            ? '#278230'
            : i % 2 === 0
              ? '#339d3b'
              : '#52c95e';
    grassCtx.beginPath();
    grassCtx.arc(x, y, r, 0, Math.PI * 2);
    grassCtx.fill();
  }
  // Crisp layered grass blade tufts
  grassCtx.lineWidth = 2.4;
  grassCtx.lineCap = 'round';
  for (let i = 0; i < 560; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    grassCtx.strokeStyle = i % 3 === 0 ? '#a7f3d0' : i % 2 === 0 ? '#86efac' : '#1b6224';
    grassCtx.beginPath();
    grassCtx.moveTo(x, y);
    grassCtx.lineTo(x + (Math.random() - 0.5) * 9, y - 6 - Math.random() * 8);
    grassCtx.stroke();
  }
  // Tiny painterly daisy & clover dots
  for (let i = 0; i < 42; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    grassCtx.fillStyle = i % 3 === 0 ? '#fef08a' : '#f8fafc';
    grassCtx.beginPath();
    grassCtx.arc(x, y, 2.2, 0, Math.PI * 2);
    grassCtx.fill();
  }
  const grassTopMap = finalizeColorTexture(grassCanvas, maxAniso, true);

  // 5. High-Detail Dirt / Cliff Side Texture (512x512 layered strata, stones, roots & rich AO overhang)
  const [dirtCanvas, dirtCtx] = makeCanvas(512, 512);
  const dirtGrad = dirtCtx.createLinearGradient(0, 0, 0, 512);
  dirtGrad.addColorStop(0, '#925e30');
  dirtGrad.addColorStop(0.42, '#7d4b21');
  dirtGrad.addColorStop(0.78, '#663a17');
  dirtGrad.addColorStop(1, '#4c2b10');
  dirtCtx.fillStyle = dirtGrad;
  dirtCtx.fillRect(0, 0, 512, 512);
  // Subtle horizontal sedimentary strata bands
  for (let y = 80; y < 500; y += 54) {
    dirtCtx.fillStyle = y % 108 === 0 ? 'rgba(60, 30, 8, 0.2)' : 'rgba(180, 120, 62, 0.14)';
    dirtCtx.fillRect(0, y, 512, 22);
  }
  for (let i = 0; i < 620; i++) {
    const x = Math.random() * 512;
    const y = 58 + Math.random() * 448;
    const w = 9 + Math.random() * 24;
    const h = 6 + Math.random() * 15;
    dirtCtx.fillStyle = i % 4 === 0 ? '#5b3414' : i % 3 === 0 ? '#a87240' : i % 2 === 0 ? '#855327' : '#6f421c';
    dirtCtx.beginPath();
    dirtCtx.roundRect(x, y, w, h, 5);
    dirtCtx.fill();
  }
  // Soft top ambient occlusion shadow beneath scalloped grass lip
  const aoGrad = dirtCtx.createLinearGradient(0, 50, 0, 134);
  aoGrad.addColorStop(0, 'rgba(12, 18, 34, 0.52)');
  aoGrad.addColorStop(0.55, 'rgba(12, 18, 34, 0.2)');
  aoGrad.addColorStop(1, 'rgba(12, 18, 34, 0)');
  dirtCtx.fillStyle = aoGrad;
  dirtCtx.fillRect(0, 50, 512, 84);

  // Grass overhang trim along top edge with highlight & deep turf scallops
  dirtCtx.fillStyle = '#258a2e';
  dirtCtx.fillRect(0, 0, 512, 54);
  dirtCtx.fillStyle = '#4ade80';
  dirtCtx.fillRect(0, 0, 512, 18);
  for (let x = 0; x < 512; x += 32) {
    dirtCtx.fillStyle = '#1f7726';
    dirtCtx.beginPath();
    dirtCtx.arc(x + 16, 54, 16, 0, Math.PI);
    dirtCtx.fill();
    dirtCtx.fillStyle = '#38b349';
    dirtCtx.beginPath();
    dirtCtx.arc(x + 16, 50, 12, 0, Math.PI);
    dirtCtx.fill();
  }
  const dirtSideMap = finalizeColorTexture(dirtCanvas, maxAniso, true);
  dirtSideMap.wrapT = THREE.ClampToEdgeWrapping;

  // 6. Crisp Ashlar Stone Block Texture (512x512 with mortar bevels & moss flecks)
  const [stoneCanvas, stoneCtx] = makeCanvas(512, 512);
  stoneCtx.fillStyle = '#334155';
  stoneCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) {
    const y = row * 128;
    const offset = (row % 2) * 64;
    for (let col = -1; col < 5; col++) {
      const x = col * 128 + offset;
      const tone = (row * 3 + col) % 3;
      stoneCtx.fillStyle = tone === 0 ? '#64748b' : tone === 1 ? '#708299' : '#57687d';
      stoneCtx.beginPath();
      stoneCtx.roundRect(x + 4, y + 4, 120, 120, 8);
      stoneCtx.fill();
      // Top bevel highlight
      stoneCtx.fillStyle = 'rgba(255,255,255,0.12)';
      stoneCtx.fillRect(x + 8, y + 6, 112, 10);
      // Bottom AO bevel
      stoneCtx.fillStyle = 'rgba(15,23,42,0.22)';
      stoneCtx.fillRect(x + 8, y + 110, 112, 10);
    }
  }
  const stoneMap = finalizeColorTexture(stoneCanvas, maxAniso, true);

  // 7. Wood Plank Texture (512x512 grain lines & rivets)
  const [woodCanvas, woodCtx] = makeCanvas(512, 512);
  woodCtx.fillStyle = '#8b4e1e';
  woodCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    const y = i * 128;
    woodCtx.fillStyle = i % 2 === 0 ? '#a9632b' : '#945320';
    woodCtx.fillRect(0, y + 4, 512, 120);
    // Subtle wood grain lines
    woodCtx.strokeStyle = 'rgba(70, 35, 10, 0.28)';
    woodCtx.lineWidth = 3;
    for (let g = 0; g < 6; g++) {
      const gy = y + 18 + g * 18;
      woodCtx.beginPath();
      woodCtx.moveTo(0, gy);
      woodCtx.bezierCurveTo(170, gy + (g % 2 === 0 ? 6 : -6), 340, gy - 4, 512, gy);
      woodCtx.stroke();
    }
    woodCtx.fillStyle = '#4a250a';
    woodCtx.fillRect(0, y + 122, 512, 6);
    // Iron rivets
    woodCtx.fillStyle = '#334155';
    [34, 478].forEach((rx) => {
      woodCtx.beginPath();
      woodCtx.arc(rx, y + 64, 9, 0, Math.PI * 2);
      woodCtx.fill();
    });
  }
  const woodPlankMap = finalizeColorTexture(woodCanvas, maxAniso, true);

  // 8. Brick Texture (512x512)
  const [brickCanvas, brickCtx] = makeCanvas(512, 512);
  brickCtx.fillStyle = '#6c2d09';
  brickCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 4; r++) {
    const y = r * 128;
    const off = (r % 2) * 64;
    for (let c = -1; c < 5; c++) {
      const x = c * 128 + off;
      brickCtx.fillStyle = (r + c) % 2 === 0 ? '#d97706' : '#c25e0a';
      brickCtx.beginPath();
      brickCtx.roundRect(x + 4, y + 4, 120, 120, 6);
      brickCtx.fill();
      brickCtx.fillStyle = 'rgba(255, 237, 213, 0.16)';
      brickCtx.fillRect(x + 8, y + 6, 112, 10);
    }
  }
  const brickMap = finalizeColorTexture(brickCanvas, maxAniso, true);

  // 9. Desert Sand Texture (512x512 wind ripples & golden pebbles)
  const [sandCanvas, sandCtx] = makeCanvas(512, 512);
  const sandGrad = sandCtx.createLinearGradient(0, 0, 512, 512);
  sandGrad.addColorStop(0, '#fbbf24');
  sandGrad.addColorStop(0.5, '#f59e0b');
  sandGrad.addColorStop(1, '#d97706');
  sandCtx.fillStyle = sandGrad;
  sandCtx.fillRect(0, 0, 512, 512);
  sandCtx.strokeStyle = 'rgba(254, 243, 199, 0.38)';
  sandCtx.lineWidth = 8;
  for (let y = 32; y < 512; y += 64) {
    sandCtx.beginPath();
    for (let x = 0; x <= 512; x += 32) {
      const wy = y + Math.sin((x / 512) * Math.PI * 4) * 10;
      if (x === 0) sandCtx.moveTo(x, wy);
      else sandCtx.lineTo(x, wy);
    }
    sandCtx.stroke();
  }
  for (let i = 0; i < 360; i++) {
    sandCtx.fillStyle = i % 2 === 0 ? 'rgba(180, 83, 9, 0.28)' : 'rgba(254, 249, 195, 0.35)';
    sandCtx.beginPath();
    sandCtx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 0, Math.PI * 2);
    sandCtx.fill();
  }
  const sandMap = finalizeColorTexture(sandCanvas, maxAniso, true);

  // 10. Glacial Ice Texture (512x512 crystalline sheen & frost cracks)
  const [iceCanvas, iceCtx] = makeCanvas(512, 512);
  const iceGrad = iceCtx.createLinearGradient(0, 0, 512, 512);
  iceGrad.addColorStop(0, '#e0f2fe');
  iceGrad.addColorStop(0.5, '#bae6fd');
  iceGrad.addColorStop(1, '#7dd3fc');
  iceCtx.fillStyle = iceGrad;
  iceCtx.fillRect(0, 0, 512, 512);
  iceCtx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  iceCtx.lineWidth = 4;
  for (let i = 0; i < 18; i++) {
    const sx = (i * 73) % 512;
    const sy = (i * 109) % 512;
    iceCtx.beginPath();
    iceCtx.moveTo(sx, sy);
    iceCtx.lineTo(sx + 55, sy + 28);
    iceCtx.lineTo(sx + 80, sy + 64);
    iceCtx.stroke();
  }
  iceCtx.fillStyle = 'rgba(255,255,255,0.45)';
  iceCtx.fillRect(0, 0, 512, 26);
  const iceMap = finalizeColorTexture(iceCanvas, maxAniso, true);

  // 11. Sky Cloud Platform Texture (soft billowy highlight shading)
  const [cloudCanvas, cloudCtx] = makeCanvas(512, 512);
  const cloudGrad = cloudCtx.createLinearGradient(0, 0, 0, 512);
  cloudGrad.addColorStop(0, '#ffffff');
  cloudGrad.addColorStop(0.65, '#f1f5f9');
  cloudGrad.addColorStop(1, '#cbd5e1');
  cloudCtx.fillStyle = cloudGrad;
  cloudCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 65; i++) {
    cloudCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    cloudCtx.beginPath();
    cloudCtx.arc(Math.random() * 512, Math.random() * 512, 18 + Math.random() * 34, 0, Math.PI * 2);
    cloudCtx.fill();
  }
  const cloudMap = finalizeColorTexture(cloudCanvas, maxAniso, true);

  // 12. Royal Kingdom Castle Marble & Gold Trim Texture
  const [castleCanvas, castleCtx] = makeCanvas(512, 512);
  castleCtx.fillStyle = '#334155';
  castleCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 4; r++) {
    const y = r * 128;
    const off = (r % 2) * 64;
    for (let c = -1; c < 5; c++) {
      const x = c * 128 + off;
      castleCtx.fillStyle = (r + c) % 2 === 0 ? '#e2e8f0' : '#cbd5e1';
      castleCtx.beginPath();
      castleCtx.roundRect(x + 4, y + 4, 120, 120, 6);
      castleCtx.fill();
    }
  }
  castleCtx.fillStyle = '#f59e0b';
  castleCtx.fillRect(0, 0, 512, 22);
  castleCtx.fillStyle = '#fef08a';
  castleCtx.fillRect(0, 0, 512, 7);
  const castleMap = finalizeColorTexture(castleCanvas, maxAniso, true);

  // 13. Molten Lava Texture (glowing magma veins)
  const [lavaCanvas, lavaCtx] = makeCanvas(512, 512);
  lavaCtx.fillStyle = '#dc2626';
  lavaCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    lavaCtx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#f97316' : '#ea580c';
    lavaCtx.beginPath();
    lavaCtx.ellipse(
      Math.random() * 512,
      Math.random() * 512,
      14 + Math.random() * 36,
      8 + Math.random() * 18,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    lavaCtx.fill();
  }
  const lavaMap = finalizeColorTexture(lavaCanvas, maxAniso, true);

  // 14. Mystery Box '?' Texture (512x512 crisp)
  const [mboxCanvas, mboxCtx] = makeCanvas(512, 512);
  const mbGrad = mboxCtx.createLinearGradient(0, 0, 512, 512);
  mbGrad.addColorStop(0, '#fde047');
  mbGrad.addColorStop(0.5, '#fbbf24');
  mbGrad.addColorStop(1, '#d97706');
  mboxCtx.fillStyle = mbGrad;
  mboxCtx.fillRect(0, 0, 512, 512);
  mboxCtx.strokeStyle = '#92400e';
  mboxCtx.lineWidth = 26;
  mboxCtx.strokeRect(13, 13, 486, 486);
  mboxCtx.fillStyle = '#78350f';
  [56, 456].forEach((rx) => {
    [56, 456].forEach((ry) => {
      mboxCtx.beginPath();
      mboxCtx.arc(rx, ry, 16, 0, Math.PI * 2);
      mboxCtx.fill();
    });
  });
  mboxCtx.font = '800 310px Outfit, sans-serif';
  mboxCtx.textAlign = 'center';
  mboxCtx.textBaseline = 'middle';
  mboxCtx.fillStyle = '#78350f';
  mboxCtx.fillText('?', 268, 280);
  mboxCtx.fillStyle = '#fffbeb';
  mboxCtx.fillText('?', 252, 264);
  const mysteryBoxMap = finalizeColorTexture(mboxCanvas, maxAniso);

  // 15. Used Mystery Box Texture
  const [uboxCanvas, uboxCtx] = makeCanvas(256, 256);
  uboxCtx.fillStyle = '#785a3c';
  uboxCtx.fillRect(0, 0, 256, 256);
  uboxCtx.strokeStyle = '#4a3520';
  uboxCtx.lineWidth = 16;
  uboxCtx.strokeRect(8, 8, 240, 240);
  uboxCtx.fillStyle = '#3b2816';
  [30, 226].forEach((rx) => {
    [30, 226].forEach((ry) => {
      uboxCtx.beginPath();
      uboxCtx.arc(rx, ry, 8, 0, Math.PI * 2);
      uboxCtx.fill();
    });
  });
  const usedBoxMap = finalizeColorTexture(uboxCanvas, maxAniso);

  // 16. Underground Cavern Wall Texture
  const [ugCanvas, ugCtx] = makeCanvas(512, 512);
  ugCtx.fillStyle = '#0f172a';
  ugCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 4; r++) {
    const y = r * 128;
    const off = (r % 2) * 64;
    for (let c = -1; c < 5; c++) {
      const x = c * 128 + off;
      ugCtx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#162032';
      ugCtx.beginPath();
      ugCtx.roundRect(x + 4, y + 4, 120, 120, 8);
      ugCtx.fill();
    }
  }
  const undergroundWallMap = finalizeColorTexture(ugCanvas, maxAniso, true);

  // 17. Checkered Finish Banner Texture
  const [chkCanvas, chkCtx] = makeCanvas(256, 128);
  const cell = 32;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      chkCtx.fillStyle = (x + y) % 2 === 0 ? '#f8fafc' : '#0f172a';
      chkCtx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const checkerBannerMap = finalizeColorTexture(chkCanvas, maxAniso);

  // 18. Smooth Water Caustics & Shimmer Texture (512x512)
  const [waterCanvas, waterCtx] = makeCanvas(512, 512);
  const wGrad = waterCtx.createLinearGradient(0, 0, 0, 512);
  wGrad.addColorStop(0, '#7dd3fc');
  wGrad.addColorStop(0.22, '#38bdf8');
  wGrad.addColorStop(0.75, '#0284c7');
  wGrad.addColorStop(1, '#0369a1');
  waterCtx.fillStyle = wGrad;
  waterCtx.fillRect(0, 0, 512, 512);
  // Subtle caustic loops
  waterCtx.strokeStyle = 'rgba(224, 242, 254, 0.32)';
  waterCtx.lineWidth = 4;
  for (let i = 0; i < 28; i++) {
    const cx = (i * 89) % 512;
    const cy = 48 + ((i * 67) % 420);
    waterCtx.beginPath();
    waterCtx.ellipse(cx, cy, 28 + (i % 3) * 10, 10 + (i % 2) * 5, 0, 0, Math.PI * 2);
    waterCtx.stroke();
  }
  waterCtx.strokeStyle = 'rgba(240, 249, 255, 0.72)';
  waterCtx.lineWidth = 5;
  for (let y = 26; y < 512; y += 56) {
    waterCtx.beginPath();
    for (let x = 0; x <= 512; x += 20) {
      const wy = y + Math.sin((x / 512) * Math.PI * 4 + y * 0.05) * 8;
      if (x === 0) waterCtx.moveTo(x, wy);
      else waterCtx.lineTo(x, wy);
    }
    waterCtx.stroke();
  }
  const waterMap = finalizeColorTexture(waterCanvas, maxAniso, true);
  waterMap.repeat.set(4, 2);

  // 19. Cascading Waterfall Texture (vertical foam streaks)
  const [wfCanvas, wfCtx] = makeCanvas(256, 512);
  const wfGrad = wfCtx.createLinearGradient(0, 0, 256, 0);
  wfGrad.addColorStop(0, 'rgba(14, 165, 233, 0.78)');
  wfGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.9)');
  wfGrad.addColorStop(1, 'rgba(14, 165, 233, 0.78)');
  wfCtx.fillStyle = wfGrad;
  wfCtx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 48; i++) {
    const sx = (i * 19) % 256;
    const sy = (i * 53) % 512;
    const len = 45 + (i % 4) * 32;
    wfCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.72)' : 'rgba(224,242,254,0.48)';
    wfCtx.fillRect(sx, sy, 6 + (i % 3) * 3, len);
  }
  const waterfallMap = finalizeColorTexture(wfCanvas, maxAniso, true);
  waterfallMap.repeat.set(1, 2);

  // 20. Radial Contact Shadow Texture (soft natural umbra + penumbra)
  const [csCanvas, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(2, 6, 23, 0.74)');
  csGrad.addColorStop(0.42, 'rgba(2, 6, 23, 0.42)');
  csGrad.addColorStop(0.78, 'rgba(2, 6, 23, 0.12)');
  csGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = finalizeColorTexture(csCanvas, maxAniso);

  // 21. Radial Soft Glow Halo Texture (for coin & night glow)
  const [ghCanvas, ghCtx] = makeCanvas(128, 128);
  const ghGrad = ghCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  ghGrad.addColorStop(0, 'rgba(254, 249, 195, 0.96)');
  ghGrad.addColorStop(0.38, 'rgba(251, 191, 36, 0.45)');
  ghGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.12)');
  ghGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ghCtx.fillStyle = ghGrad;
  ghCtx.fillRect(0, 0, 128, 128);
  const glowHaloMap = finalizeColorTexture(ghCanvas, maxAniso);

  // 22. "GFluton!" Animated Mystery Box Callout Texture (512x192 crisp golden lettering)
  const [gfCanvas, gfCtx] = makeCanvas(512, 192);
  gfCtx.clearRect(0, 0, 512, 192);

  // Soft warm golden radiance behind text so it pops on every sky
  const textAura = gfCtx.createRadialGradient(256, 98, 22, 256, 98, 225);
  textAura.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
  textAura.addColorStop(0.55, 'rgba(245, 158, 11, 0.2)');
  textAura.addColorStop(1, 'rgba(245, 158, 11, 0)');
  gfCtx.fillStyle = textAura;
  gfCtx.fillRect(0, 0, 512, 192);

  // Bold arcade outline + drop shadow + warm gold gradient fill for "GFluton!"
  gfCtx.save();
  gfCtx.font = '900 94px Outfit, system-ui, -apple-system, sans-serif';
  gfCtx.textAlign = 'center';
  gfCtx.textBaseline = 'middle';
  gfCtx.lineJoin = 'round';
  gfCtx.lineCap = 'round';

  gfCtx.shadowColor = 'rgba(15, 23, 42, 0.85)';
  gfCtx.shadowBlur = 12;
  gfCtx.shadowOffsetY = 5;
  gfCtx.strokeStyle = '#1e1b4b';
  gfCtx.lineWidth = 20;
  gfCtx.strokeText('GFluton!', 256, 98);

  gfCtx.shadowColor = 'transparent';
  gfCtx.strokeStyle = '#92400e';
  gfCtx.lineWidth = 10;
  gfCtx.strokeText('GFluton!', 256, 98);

  const textGrad = gfCtx.createLinearGradient(0, 48, 0, 148);
  textGrad.addColorStop(0, '#ffffff');
  textGrad.addColorStop(0.28, '#fef08a');
  textGrad.addColorStop(0.68, '#fbbf24');
  textGrad.addColorStop(1, '#ea580c');
  gfCtx.fillStyle = textGrad;
  gfCtx.fillText('GFluton!', 256, 98);

  gfCtx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  gfCtx.lineWidth = 2;
  gfCtx.strokeText('GFluton!', 256, 97);
  gfCtx.restore();
  const gflutonTextMap = finalizeColorTexture(gfCanvas, maxAniso);

  // 23. 4-Point Golden Sparkle Star Texture (128x128)
  const [spCanvas, spCtx] = makeCanvas(128, 128);
  const spAura = spCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  spAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  spAura.addColorStop(0.35, 'rgba(253, 224, 71, 0.72)');
  spAura.addColorStop(0.75, 'rgba(245, 158, 11, 0.22)');
  spAura.addColorStop(1, 'rgba(245, 158, 11, 0)');
  spCtx.fillStyle = spAura;
  spCtx.fillRect(0, 0, 128, 128);

  spCtx.fillStyle = '#fffbeb';
  spCtx.beginPath();
  spCtx.moveTo(64, 6);
  spCtx.quadraticCurveTo(68, 58, 122, 64);
  spCtx.quadraticCurveTo(68, 70, 64, 122);
  spCtx.quadraticCurveTo(60, 70, 6, 64);
  spCtx.quadraticCurveTo(60, 58, 64, 6);
  spCtx.closePath();
  spCtx.fill();
  const sparkleStarMap = finalizeColorTexture(spCanvas, maxAniso);

  // 24. Linear Terrain Micro-Relief Bump Map (256x256 seamless)
  const [tbCanvas, tbCtx] = makeCanvas(256, 256);
  tbCtx.fillStyle = '#808080';
  tbCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 950; i++) {
    const shade = 95 + (i * 37) % 85;
    tbCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    tbCtx.beginPath();
    tbCtx.arc((i * 73) % 256, (i * 139) % 256, 2 + (i % 4) * 1.4, 0, Math.PI * 2);
    tbCtx.fill();
  }
  const terrainBumpMap = new THREE.CanvasTexture(tbCanvas);
  terrainBumpMap.wrapS = THREE.RepeatWrapping;
  terrainBumpMap.wrapT = THREE.RepeatWrapping;
  terrainBumpMap.anisotropy = maxAniso;
  terrainBumpMap.needsUpdate = true;

  // 25. Linear Fine Fur & Tuxedo Weave Micro-Bump Map (256x256)
  const [fbCanvas, fbCtx] = makeCanvas(256, 256);
  fbCtx.fillStyle = '#7c7c7c';
  fbCtx.fillRect(0, 0, 256, 256);
  fbCtx.lineWidth = 1.5;
  for (let i = 0; i < 520; i++) {
    const x = (i * 47) % 256;
    const y = (i * 83) % 256;
    const lum = i % 2 === 0 ? 156 : 102;
    fbCtx.strokeStyle = `rgb(${lum},${lum},${lum})`;
    fbCtx.beginPath();
    fbCtx.moveTo(x, y);
    fbCtx.lineTo(x + 2, y + 7);
    fbCtx.stroke();
  }
  const furBumpMap = new THREE.CanvasTexture(fbCanvas);
  furBumpMap.wrapS = THREE.RepeatWrapping;
  furBumpMap.wrapT = THREE.RepeatWrapping;
  furBumpMap.repeat.set(3, 3);
  furBumpMap.needsUpdate = true;

  // 26. Linear Per-Face Ambient Occlusion Vignette Map (256x256 for uv2 aoMap)
  const [aoCanvas, aoCtx] = makeCanvas(256, 256);
  aoCtx.fillStyle = '#ffffff';
  aoCtx.fillRect(0, 0, 256, 256);
  const edgeTop = aoCtx.createLinearGradient(0, 0, 0, 38);
  edgeTop.addColorStop(0, 'rgba(95, 95, 110, 1)');
  edgeTop.addColorStop(1, 'rgba(255, 255, 255, 0)');
  aoCtx.fillStyle = edgeTop;
  aoCtx.fillRect(0, 0, 256, 38);
  const edgeBot = aoCtx.createLinearGradient(0, 212, 0, 256);
  edgeBot.addColorStop(0, 'rgba(255, 255, 255, 0)');
  edgeBot.addColorStop(1, 'rgba(72, 72, 92, 1)');
  aoCtx.fillStyle = edgeBot;
  aoCtx.fillRect(0, 212, 256, 44);
  const edgeL = aoCtx.createLinearGradient(0, 0, 28, 0);
  edgeL.addColorStop(0, 'rgba(130, 130, 145, 0.85)');
  edgeL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  aoCtx.fillStyle = edgeL;
  aoCtx.fillRect(0, 0, 28, 256);
  const edgeR = aoCtx.createLinearGradient(228, 0, 256, 0);
  edgeR.addColorStop(0, 'rgba(255, 255, 255, 0)');
  edgeR.addColorStop(1, 'rgba(130, 130, 145, 0.85)');
  aoCtx.fillStyle = edgeR;
  aoCtx.fillRect(228, 0, 28, 256);
  const aoEdgeMap = new THREE.CanvasTexture(aoCanvas);
  aoEdgeMap.channel = 1;
  aoEdgeMap.needsUpdate = true;

  return {
    coinFaceMap,
    coinBumpMap,
    foreheadLogoMap,
    grassTopMap,
    dirtSideMap,
    stoneMap,
    woodPlankMap,
    brickMap,
    sandMap,
    iceMap,
    cloudMap,
    castleMap,
    lavaMap,
    mysteryBoxMap,
    usedBoxMap,
    undergroundWallMap,
    checkerBannerMap,
    waterMap,
    waterfallMap,
    contactShadowMap,
    glowHaloMap,
    gflutonTextMap,
    sparkleStarMap,
    terrainBumpMap,
    furBumpMap,
    aoEdgeMap,
    dispose: () => {
      coinFaceMap.dispose();
      coinBumpMap.dispose();
      foreheadLogoMap.dispose();
      grassTopMap.dispose();
      dirtSideMap.dispose();
      stoneMap.dispose();
      woodPlankMap.dispose();
      brickMap.dispose();
      sandMap.dispose();
      iceMap.dispose();
      cloudMap.dispose();
      castleMap.dispose();
      lavaMap.dispose();
      mysteryBoxMap.dispose();
      usedBoxMap.dispose();
      undergroundWallMap.dispose();
      checkerBannerMap.dispose();
      waterMap.dispose();
      waterfallMap.dispose();
      contactShadowMap.dispose();
      glowHaloMap.dispose();
      gflutonTextMap.dispose();
      sparkleStarMap.dispose();
      terrainBumpMap.dispose();
      furBumpMap.dispose();
      aoEdgeMap.dispose();
    },
  };
}
