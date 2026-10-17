import * as THREE from 'three';
import { ApertureStop, computeOpticalReadout, FocusPreset } from './opticsMath';

/**
 * Helper to draw a multi-pass disc blur of an offscreen canvas onto a target context
 * so it works reliably across all browsers.
 */
function drawLayerWithOpticalBlur(
  targetCtx: CanvasRenderingContext2D,
  layerCanvas: HTMLCanvasElement,
  blurNormalized: number, // 0..1
  maxBlurPx: number
) {
  const blurRadius = blurNormalized * maxBlurPx;
  if (blurRadius < 0.8) {
    targetCtx.drawImage(layerCanvas, 0, 0);
    return;
  }

  const supportsFilter = typeof targetCtx.filter === 'string';
  if (supportsFilter) {
    targetCtx.save();
    targetCtx.filter = `blur(${(blurRadius * 0.65).toFixed(1)}px)`;
    targetCtx.drawImage(layerCanvas, 0, 0);
    targetCtx.restore();
  }

  const taps = 8;
  targetCtx.save();
  targetCtx.globalAlpha = supportsFilter ? 0.42 / taps : 0.95 / (taps + 1);
  if (!supportsFilter) {
    targetCtx.drawImage(layerCanvas, 0, 0);
  }
  const r = blurRadius * 0.75;
  for (let i = 0; i < taps; i++) {
    const angle = (i / taps) * Math.PI * 2;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;
    targetCtx.drawImage(layerCanvas, dx, dy);
  }
  targetCtx.restore();
}

/**
 * Draws the natural alpine valley scene onto 3 separate depth layer canvases
 * (Background Granite Mountains, Midground Cedar Cabin + Olive-Green Tree, Foreground Deep Evergreen Pines).
 * If `inverted` is true, renders upside-down & horizontally flipped (real optical image on sensor).
 */
function renderSceneLayers(
  bgCtx: CanvasRenderingContext2D,
  midCtx: CanvasRenderingContext2D,
  fgCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  inverted: boolean
) {
  const setupTransform = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (inverted) {
      ctx.translate(width, height);
      ctx.scale(-1, -1);
    }
  };

  // 1. BACKGROUND LAYER (Natural Alpine Granite Mountains at 90 cm)
  setupTransform(bgCtx);
  // Main granite peak (lit warm-slate facet)
  const mainPeakGrad = bgCtx.createLinearGradient(0, height * 0.14, 0, height * 0.68);
  mainPeakGrad.addColorStop(0, '#6c7687');
  mainPeakGrad.addColorStop(1, '#434b59');
  bgCtx.fillStyle = mainPeakGrad;
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.48, height * 0.68);
  bgCtx.lineTo(width * 0.74, height * 0.14);
  bgCtx.lineTo(width * 0.98, height * 0.68);
  bgCtx.closePath();
  bgCtx.fill();

  // Shaded right granite facet
  bgCtx.fillStyle = '#363d4a';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.74, height * 0.14);
  bgCtx.lineTo(width * 0.98, height * 0.68);
  bgCtx.lineTo(width * 0.75, height * 0.68);
  bgCtx.closePath();
  bgCtx.fill();

  // Central ridge highlight facet
  bgCtx.fillStyle = '#586273';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.74, height * 0.14);
  bgCtx.lineTo(width * 0.64, height * 0.68);
  bgCtx.lineTo(width * 0.75, height * 0.68);
  bgCtx.closePath();
  bgCtx.fill();

  // Natural warm-ivory snow cap on main peak (lit side + shadow side)
  bgCtx.fillStyle = '#ebe8e1';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.74, height * 0.14);
  bgCtx.lineTo(width * 0.645, height * 0.34);
  bgCtx.lineTo(width * 0.70, height * 0.31);
  bgCtx.lineTo(width * 0.74, height * 0.36);
  bgCtx.closePath();
  bgCtx.fill();

  bgCtx.fillStyle = '#c8c5be';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.74, height * 0.14);
  bgCtx.lineTo(width * 0.74, height * 0.36);
  bgCtx.lineTo(width * 0.78, height * 0.33);
  bgCtx.lineTo(width * 0.825, height * 0.32);
  bgCtx.closePath();
  bgCtx.fill();

  // Secondary granite peak
  bgCtx.fillStyle = '#555f70';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.30, height * 0.68);
  bgCtx.lineTo(width * 0.52, height * 0.27);
  bgCtx.lineTo(width * 0.71, height * 0.68);
  bgCtx.closePath();
  bgCtx.fill();

  bgCtx.fillStyle = '#3e4654';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.52, height * 0.27);
  bgCtx.lineTo(width * 0.71, height * 0.68);
  bgCtx.lineTo(width * 0.54, height * 0.68);
  bgCtx.closePath();
  bgCtx.fill();

  // Secondary snow cap
  bgCtx.fillStyle = '#e3e0d8';
  bgCtx.beginPath();
  bgCtx.moveTo(width * 0.52, height * 0.27);
  bgCtx.lineTo(width * 0.45, height * 0.42);
  bgCtx.lineTo(width * 0.52, height * 0.39);
  bgCtx.lineTo(width * 0.58, height * 0.42);
  bgCtx.closePath();
  bgCtx.fill();
  bgCtx.restore();

  // 2. MIDGROUND LAYER (Deep Natural Woodland Meadow, Cedar Cabin & Olive-Emerald Tree at 54 cm)
  setupTransform(midCtx);
  const hillGrad = midCtx.createLinearGradient(0, height * 0.56, 0, height);
  hillGrad.addColorStop(0, '#365832');
  hillGrad.addColorStop(0.5, '#2b4728');
  hillGrad.addColorStop(1, '#1e331c');
  midCtx.fillStyle = hillGrad;
  midCtx.beginPath();
  midCtx.moveTo(0, height * 0.64);
  midCtx.quadraticCurveTo(width * 0.35, height * 0.54, width * 0.68, height * 0.62);
  midCtx.quadraticCurveTo(width * 0.88, height * 0.66, width, height * 0.60);
  midCtx.lineTo(width, height);
  midCtx.lineTo(0, height);
  midCtx.closePath();
  midCtx.fill();

  // Natural deciduous woodland tree next to cabin
  const treeX = width * 0.40;
  const treeBaseY = height * 0.64;
  midCtx.fillStyle = '#472d18';
  midCtx.fillRect(treeX - width * 0.012, treeBaseY - height * 0.12, width * 0.024, height * 0.12);

  const canopyGrad = midCtx.createRadialGradient(
    treeX - width * 0.02,
    treeBaseY - height * 0.18,
    width * 0.01,
    treeX,
    treeBaseY - height * 0.16,
    width * 0.075
  );
  canopyGrad.addColorStop(0, '#4a733b');
  canopyGrad.addColorStop(0.65, '#355729');
  canopyGrad.addColorStop(1, '#243d1b');
  midCtx.fillStyle = canopyGrad;
  midCtx.beginPath();
  midCtx.arc(treeX, treeBaseY - height * 0.16, width * 0.068, 0, Math.PI * 2);
  midCtx.fill();

  // Weathered Cedar Alpine Cabin
  const cx = width * 0.54;
  const cy = height * 0.65;
  const cw = width * 0.15;
  const ch = height * 0.13;

  midCtx.fillStyle = '#8f5d38';
  midCtx.fillRect(cx - cw * 0.5, cy - ch, cw, ch);
  midCtx.fillStyle = '#633e22';
  midCtx.fillRect(cx + cw * 0.15, cy - ch, cw * 0.35, ch);

  midCtx.fillStyle = '#2b190e';
  midCtx.beginPath();
  midCtx.moveTo(cx - cw * 0.64, cy - ch * 0.92);
  midCtx.lineTo(cx, cy - ch * 1.65);
  midCtx.lineTo(cx + cw * 0.64, cy - ch * 0.92);
  midCtx.closePath();
  midCtx.fill();

  // Warm tungsten hearth glow in cabin windows
  midCtx.fillStyle = '#ffda75';
  midCtx.shadowColor = '#f59e0b';
  midCtx.shadowBlur = 12;
  midCtx.fillRect(cx - cw * 0.32, cy - ch * 0.68, cw * 0.22, ch * 0.34);
  midCtx.fillRect(cx + cw * 0.02, cy - ch * 0.68, cw * 0.22, ch * 0.34);
  midCtx.shadowBlur = 0;

  midCtx.strokeStyle = '#3d2310';
  midCtx.lineWidth = 2;
  midCtx.strokeRect(cx - cw * 0.32, cy - ch * 0.68, cw * 0.22, ch * 0.34);
  midCtx.strokeRect(cx + cw * 0.02, cy - ch * 0.68, cw * 0.22, ch * 0.34);
  midCtx.restore();

  // 3. FOREGROUND LAYER (Deep Evergreen Spruce/Pine Trees at 27 cm)
  setupTransform(fgCtx);
  fgCtx.fillStyle = '#1b3019';
  fgCtx.beginPath();
  fgCtx.moveTo(0, height * 0.78);
  fgCtx.quadraticCurveTo(width * 0.4, height * 0.72, width, height * 0.80);
  fgCtx.lineTo(width, height);
  fgCtx.lineTo(0, height);
  fgCtx.closePath();
  fgCtx.fill();

  const drawPine = (px: number, baseY: number, scale: number) => {
    const trunkW = width * 0.026 * scale;
    const trunkH = height * 0.11 * scale;
    fgCtx.fillStyle = '#3d2514';
    fgCtx.fillRect(px - trunkW / 2, baseY - trunkH, trunkW, trunkH);

    const tiers = [
      { yOffset: 0.08, w: 0.19, h: 0.19, lit: '#1f4226', shade: '#152e1a' },
      { yOffset: 0.20, w: 0.155, h: 0.18, lit: '#254f2d', shade: '#193820' },
      { yOffset: 0.31, w: 0.115, h: 0.16, lit: '#2c5c35', shade: '#1e4226' },
    ];
    for (const t of tiers) {
      const tierBottom = baseY - height * t.yOffset * scale;
      const tierTop = tierBottom - height * t.h * scale;
      const halfW = (width * t.w * scale) / 2;

      // Lit left side of evergreen tier
      fgCtx.fillStyle = t.lit;
      fgCtx.beginPath();
      fgCtx.moveTo(px - halfW, tierBottom);
      fgCtx.lineTo(px, tierTop);
      fgCtx.lineTo(px, tierBottom);
      fgCtx.closePath();
      fgCtx.fill();

      // Shaded right side of evergreen tier
      fgCtx.fillStyle = t.shade;
      fgCtx.beginPath();
      fgCtx.moveTo(px, tierBottom);
      fgCtx.lineTo(px, tierTop);
      fgCtx.lineTo(px + halfW, tierBottom);
      fgCtx.closePath();
      fgCtx.fill();
    }
  };

  drawPine(width * 0.26, height * 0.84, 1.18);
  drawPine(width * 0.14, height * 0.87, 0.86);
  fgCtx.restore();
}

/**
 * Manages the dynamic Ground Glass Image Plane texture (inverted optical projection + ray blur discs).
 */
export class SensorGroundGlassRenderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private midCanvas: HTMLCanvasElement;
  private fgCanvas: HTMLCanvasElement;
  private lastFocusCm = -1;
  private lastAperture: ApertureStop | null = null;

  constructor(maxAnisotropy: number = 4) {
    const width = 512;
    const height = 384;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;

    this.midCanvas = document.createElement('canvas');
    this.midCanvas.width = width;
    this.midCanvas.height = height;

    this.fgCanvas = document.createElement('canvas');
    this.fgCanvas.width = width;
    this.fgCanvas.height = height;

    renderSceneLayers(
      this.bgCanvas.getContext('2d')!,
      this.midCanvas.getContext('2d')!,
      this.fgCanvas.getContext('2d')!,
      width,
      height,
      true
    );

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.update(54, 2);
  }

  public update(focusDistanceCm: number, aperture: ApertureStop) {
    if (this.lastFocusCm === focusDistanceCm && this.lastAperture === aperture) {
      return;
    }
    this.lastFocusCm = focusDistanceCm;
    this.lastAperture = aperture;

    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const readout = computeOpticalReadout(focusDistanceCm, aperture);

    // Inverted atmospheric alpine dusk/studio backdrop on the ground glass
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#223820');
    skyGrad.addColorStop(0.32, '#3d5e38');
    skyGrad.addColorStop(0.48, '#94a8b8');
    skyGrad.addColorStop(1, '#647a91');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const maxBlurPx = 24;
    drawLayerWithOpticalBlur(
      ctx,
      this.bgCanvas,
      readout.subjectBlurNormalized.background,
      maxBlurPx
    );
    drawLayerWithOpticalBlur(
      ctx,
      this.midCanvas,
      readout.subjectBlurNormalized.middle,
      maxBlurPx
    );
    drawLayerWithOpticalBlur(
      ctx,
      this.fgCanvas,
      readout.subjectBlurNormalized.foreground,
      maxBlurPx
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    const margin = 18;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    const landingPoints: Array<{
      preset: FocusPreset;
      x: number;
      y: number;
    }> = [
      { preset: 'background', x: width * 0.26, y: height * 0.68 },
      { preset: 'middle', x: width * 0.46, y: height * 0.49 },
      { preset: 'foreground', x: width * 0.74, y: height * 0.56 },
    ];

    for (const pt of landingPoints) {
      const blurNorm = readout.subjectBlurNormalized[pt.preset];
      const discRadius = 3.5 + blurNorm * 38;

      ctx.save();
      if (blurNorm < 0.04) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, discRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, discRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.3,
      width / 2,
      height / 2,
      width * 0.62
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    this.texture.needsUpdate = true;
  }
}

/**
 * Generates the 5-frame illuminated focus preview bay + linear slider markings & technical legends
 * ("50mm F/2 OPTICAL BENCH", "FOCUS DISTANCE", "< ───┼─── >") on the front of the bench console.
 */
export class ConsoleFilmstripRenderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private frameCanvases: HTMLCanvasElement[] = [];
  private sampleDistances = [27, 40, 54, 72, 90];
  private sampleLabels = ['27 cm · PINE', '40 cm', '54 cm · CABIN', '72 cm', '90 cm · PEAK'];

  constructor(maxAnisotropy: number = 4) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 320;
    this.ctx = this.canvas.getContext('2d')!;

    const fw = 212;
    const fh = 158;

    const bgTemp = document.createElement('canvas');
    bgTemp.width = fw;
    bgTemp.height = fh;
    const midTemp = document.createElement('canvas');
    midTemp.width = fw;
    midTemp.height = fh;
    const fgTemp = document.createElement('canvas');
    fgTemp.width = fw;
    fgTemp.height = fh;

    renderSceneLayers(
      bgTemp.getContext('2d')!,
      midTemp.getContext('2d')!,
      fgTemp.getContext('2d')!,
      fw,
      fh,
      false
    );

    for (const d of this.sampleDistances) {
      const fCanvas = document.createElement('canvas');
      fCanvas.width = fw;
      fCanvas.height = fh;
      const fCtx = fCanvas.getContext('2d')!;

      const sky = fCtx.createLinearGradient(0, 0, 0, fh);
      sky.addColorStop(0, '#647a91');
      sky.addColorStop(0.62, '#94a8b8');
      sky.addColorStop(1, '#223820');
      fCtx.fillStyle = sky;
      fCtx.fillRect(0, 0, fw, fh);

      const readout = computeOpticalReadout(d, 2);
      drawLayerWithOpticalBlur(fCtx, bgTemp, readout.subjectBlurNormalized.background, 9);
      drawLayerWithOpticalBlur(fCtx, midTemp, readout.subjectBlurNormalized.middle, 9);
      drawLayerWithOpticalBlur(fCtx, fgTemp, readout.subjectBlurNormalized.foreground, 9);

      this.frameCanvases.push(fCanvas);
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.update(54, 2);
  }

  public update(focusDistanceCm: number, aperture: ApertureStop = 2) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(200, 146, 63, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`50mm f/${aperture} OPTICAL BENCH`, 44, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212, 163, 89, 0.85)';
    ctx.fillText(`PLANE OF FOCUS · ${focusDistanceCm} CM`, width / 2, 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
    ctx.fillText('DEPTH OF FIELD SERIES', width - 44, 28);

    let closestIdx = 0;
    let minDiff = Infinity;
    this.sampleDistances.forEach((d, idx) => {
      const diff = Math.abs(focusDistanceCm - d);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const fw = 212;
    const fh = 158;
    const gap = 22;
    const totalW = 5 * fw + 4 * gap;
    const startX = (width - totalW) / 2;
    const startY = 42;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * (fw + gap);
      const y = startY;
      ctx.drawImage(this.frameCanvases[i], x, y);

      if (i === closestIdx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.5;
        ctx.strokeRect(x - 2, y - 2, fw + 4, fh + 4);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.fillRect(x, y, fw, fh);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, fw, fh);
      }

      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = i === closestIdx ? '#ffffff' : 'rgba(255, 255, 255, 0.42)';
      ctx.fillText(this.sampleLabels[i], x + fw / 2, y + fh + 20);
    }

    const trackY = 272;
    const trackLeft = 140;
    const trackRight = width - 140;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(trackLeft - 28, trackY - 9);
    ctx.lineTo(trackLeft - 40, trackY);
    ctx.lineTo(trackLeft - 28, trackY + 9);
    ctx.moveTo(trackRight + 28, trackY - 9);
    ctx.lineTo(trackRight + 40, trackY);
    ctx.lineTo(trackRight + 28, trackY + 9);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trackLeft, trackY);
    ctx.lineTo(trackRight, trackY);
    ctx.stroke();

    const numTicks = 40;
    for (let t = 0; t <= numTicks; t++) {
      const tx = trackLeft + (t / numTicks) * (trackRight - trackLeft);
      const isMajor = t % 10 === 0;
      const isMid = t % 5 === 0 && !isMajor;
      const th = isMajor ? 14 : isMid ? 9 : 5;
      ctx.strokeStyle = isMajor
        ? 'rgba(255, 255, 255, 0.8)'
        : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = isMajor ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, trackY - th);
      ctx.lineTo(tx, trackY + th);
      ctx.stroke();
    }

    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'left';
    ctx.fillText('NEAR · 20 CM', trackLeft, trackY + 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212, 163, 89, 0.8)';
    ctx.fillText('50MM F/2 OPTICAL BENCH · LINEAR FOCUS SCRUB', width / 2, trackY + 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('FAR · 100 CM', trackRight, trackY + 30);

    this.texture.needsUpdate = true;
  }
}

/**
 * Creates a procedural Camera Aperture Iris texture for the circular aperture units
 * on the left ('master' matching Image 4) and right (f/2, f/5.6, f/16 matching Image 5)
 * sides of the Optical Bench Console front panel.
 */
export function createConsoleApertureDialTexture(
  fStop: ApertureStop | 'master',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, size, size);

  if (fStop === 'master') {
    // ========================================================================
    // LEFT LARGE APERTURE RING (Matches Reference Image 4):
    // Thick warm cream-champagne outer ring + olive-bronze curved 8-blade iris
    // + octagonal black center pupil with subtle inner highlight
    // ========================================================================
    const outerRadius = 246;
    const irisOuterRadius = 166;
    const octagonRadius = 98;
    const sides = 8;

    // 1. Warm cream-champagne outer flat ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ccc6b6';
    ctx.fill();

    // 2. Warm dark olive-bronze iris blade ring
    ctx.beginPath();
    ctx.arc(cx, cy, irisOuterRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#5a5447';
    ctx.fill();

    // Compute octagon vertices
    const octPts: Array<{ x: number; y: number; angle: number }> = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 8;
      octPts.push({
        x: cx + Math.cos(a) * octagonRadius,
        y: cy + Math.sin(a) * octagonRadius,
        angle: a,
      });
    }

    // 3. Curved overlapping blade seam arcs from each octagon vertex to irisOuterRadius
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, irisOuterRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = '#23201b';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < sides; i++) {
      const v = octPts[i];
      const endAngle = v.angle - 0.72;
      const ctrlAngle = v.angle - 0.32;
      const ctrlR = (octagonRadius + irisOuterRadius) * 0.54;

      const ex = cx + Math.cos(endAngle) * (irisOuterRadius + 6);
      const ey = cy + Math.sin(endAngle) * (irisOuterRadius + 6);
      const qx = cx + Math.cos(ctrlAngle) * ctrlR;
      const qy = cy + Math.sin(ctrlAngle) * ctrlR;

      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.quadraticCurveTo(qx, qy, ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Central 8-sided octagonal black pupil + subtle cool-silver inner edge highlight
    ctx.beginPath();
    octPts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#07080b';
    ctx.fill();

    ctx.strokeStyle = 'rgba(195, 208, 222, 0.48)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  } else {
    // ========================================================================
    // RIGHT 3 APERTURE RINGS (Matches Reference Image 5):
    // Sleek dark charcoal-black outer bezel + warm cream/ivory 7-blade iris
    // + straight tangent blade lines + heptagonal black center opening
    // ========================================================================
    const outerBezelRadius = 246;
    const creamBladeRadius = 208;
    const sides = 7;
    const pupilRadius =
      fStop === 2 ? 116 : fStop === 5.6 ? 52 : 18;
    const rotOffset =
      fStop === 2 ? -0.18 : fStop === 5.6 ? 0.08 : 0.25;

    // 1. Outer black bezel ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerBezelRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#090b10';
    ctx.fill();

    // Subtle dark metallic inner rim
    ctx.beginPath();
    ctx.arc(cx, cy, creamBladeRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#222733';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Warm cream-ivory aperture blade surface
    ctx.beginPath();
    ctx.arc(cx, cy, creamBladeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#c9c4b6';
    ctx.fill();

    // Compute 7-sided heptagon vertices
    const polyPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rotOffset;
      polyPts.push({
        x: cx + Math.cos(a) * pupilRadius,
        y: cy + Math.sin(a) * pupilRadius,
      });
    }

    // 3. Crisp straight tangent blade lines extending from each polygon edge out to the bezel
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, creamBladeRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = '#2b2924';
    ctx.lineWidth = 3.6;
    for (let i = 0; i < sides; i++) {
      const pCurr = polyPts[i];
      const pNext = polyPts[(i + 1) % sides];
      // Direction vector along the polygon edge (extended backwards/outwards to the rim)
      const dx = pCurr.x - pNext.x;
      const dy = pCurr.y - pNext.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      ctx.beginPath();
      ctx.moveTo(pCurr.x, pCurr.y);
      ctx.lineTo(pCurr.x + ux * 260, pCurr.y + uy * 260);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Central heptagonal black opening
    ctx.beginPath();
    polyPts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#090b10';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates a clean architectural console nameplate texture for placing aperture text
 * neatly below the left and right aperture rings on the optical bench table.
 */
export function createConsoleApertureLabelTexture(
  labelText: string,
  accentGold: boolean = false,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 64);

  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentGold ? '#d4a359' : 'rgba(216, 208, 192, 0.78)';
  ctx.fillText(labelText, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates the precision centimeter ruler texture for the optical bench rail (10 cm .. 100 cm).
 */
export function createOpticalRailRulerTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#262c3a';
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';

  const minCm = 5;
  const maxCm = 105;
  for (let cm = minCm; cm <= maxCm; cm++) {
    const t = (cm - minCm) / (maxCm - minCm);
    const x = t * canvas.width;

    const isMajor = cm % 10 === 0;
    const isMedium = cm % 5 === 0 && !isMajor;

    ctx.lineWidth = isMajor ? 3 : isMedium ? 2 : 1;
    const tickH = isMajor ? 36 : isMedium ? 24 : 14;

    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x, 12 + tickH);
    ctx.stroke();

    if (isMajor && cm >= 10 && cm <= 100) {
      ctx.fillText(`${cm}`, x, 84);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates the 3 framed pictures on the bluish-grey back wall depicting the Plane of Focus ability.
 */
export function createGalleryWallPrintTexture(
  variant: 0 | 1 | 2,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c0f15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(235, 230, 218, 0.78)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.strokeStyle = 'rgba(235, 230, 218, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 104);

  const drawStylizedPine = (
    px: number,
    baseY: number,
    scale: number,
    isSharp: boolean,
    blurDiscRadius: number
  ) => {
    ctx.save();
    if (!isSharp) {
      if (typeof ctx.filter === 'string') {
        ctx.filter = `blur(${blurDiscRadius * 0.45}px)`;
      }
      ctx.globalAlpha = 0.28;
    } else {
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#edeae2';
    const trunkW = 14 * scale;
    const trunkH = 38 * scale;
    ctx.fillRect(px - trunkW / 2, baseY - trunkH, trunkW, trunkH);

    const tiers = [
      { bottom: baseY - 26 * scale, top: baseY - 115 * scale, halfW: 72 * scale },
      { bottom: baseY - 82 * scale, top: baseY - 170 * scale, halfW: 56 * scale },
      { bottom: baseY - 138 * scale, top: baseY - 220 * scale, halfW: 38 * scale },
    ];
    for (const t of tiers) {
      ctx.beginPath();
      ctx.moveTo(px - t.halfW, t.bottom);
      ctx.lineTo(px, t.top);
      ctx.lineTo(px + t.halfW, t.bottom);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (!isSharp) {
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 230, 218, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, baseY - 140 * scale, blurDiscRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(46, baseY);
      ctx.lineTo(canvas.width - 46, baseY);
      ctx.stroke();

      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(px, baseY - 135 * scale, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  drawStylizedPine(252, 265, 0.56, variant === 2, variant === 0 ? 28 : 18);
  drawStylizedPine(192, 325, 0.85, variant === 1, 22);
  drawStylizedPine(124, 372, 1.05, variant === 0, variant === 2 ? 30 : 20);

  ctx.fillStyle = 'rgba(235, 230, 218, 0.85)';
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const titles = [
    'I. FOREGROUND PLANE · 27 CM',
    'II. MIDGROUND PLANE · 54 CM',
    'III. BACKGROUND PLANE · 90 CM',
  ];
  const subtitles = [
    'NEAR RAYS CONVERGE · FAR RAYS BLUR',
    'CENTER CONVERGES · EXTREMES DISC',
    'INFINITY CONVERGES · NEAR RAYS DISC',
  ];
  ctx.fillText(titles[variant], canvas.width / 2, 412);
  ctx.fillStyle = 'rgba(200, 146, 63, 0.85)';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillText(subtitles[variant], canvas.width / 2, 434);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Generates the warm creamy architectural gallery stone tile floor texture
 * calibrated for indoor gallery spotlight reflections (not overblown).
 */
export function createTiledFloorTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d8d0c0';
  ctx.fillRect(0, 0, 512, 512);

  const tiles = 4;
  const step = 512 / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const variation = ((x + y) % 2) * 5;
      const r = 216 + variation;
      const g = 208 + variation;
      const b = 192 + variation;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = '#b0a694';
  ctx.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, 512);
    ctx.moveTo(0, i * step);
    ctx.lineTo(512, i * step);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.anisotropy = maxAnisotropy;
  return texture;
}
