import * as THREE from 'three';
import { FocusPreset, SCENE_SUBJECTS } from './opticsMath';

export interface RayBundleConfig {
  preset: FocusPreset;
  sourcePos: THREE.Vector3;
  sensorLandingPos: THREE.Vector3;
  colorHex: number;
}

const RAYS_PER_BUNDLE = 10; // Clean, distinct meridian & cone rays matching the video
const POINTS_PER_RAY = 9; // [Source, Lens1, Lens2, Lens3, Aperture, Lens4, Lens5, Lens6, SensorPlane]

export class OpticalRayTracer3D {
  public readonly group: THREE.Group;
  private bundles: Map<
    FocusPreset,
    {
      config: RayBundleConfig;
      lines: THREE.LineSegments;
      positionAttr: THREE.BufferAttribute;
      material: THREE.LineBasicMaterial;
      sourceDot: THREE.Mesh;
      sensorRing: THREE.LineLoop;
      sensorDot: THREE.Mesh;
    }
  > = new Map();

  private readonly rayAngles: Array<{ cos: number; sin: number; radiusScale: number }> = [];

  constructor(opticalAxisY: number, sensorX: number) {
    this.group = new THREE.Group();

    // 1 central chief ray
    this.rayAngles.push({ cos: 0, sin: 0, radiusScale: 0 });
    // 9 clean perimeter cone rays (spaced evenly so individual ray paths are crisp and easy to trace)
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.rayAngles.push({ cos: Math.cos(a), sin: Math.sin(a), radiusScale: 1.0 });
    }

    const bundleConfigs: RayBundleConfig[] = [
      {
        preset: 'foreground',
        sourcePos: new THREE.Vector3(
          SCENE_SUBJECTS.foreground.worldX,
          opticalAxisY + 0.12,
          0.48
        ),
        sensorLandingPos: new THREE.Vector3(sensorX, opticalAxisY - 0.08, -0.44),
        colorHex: 0xe6fcf5,
      },
      {
        preset: 'middle',
        sourcePos: new THREE.Vector3(
          SCENE_SUBJECTS.middle.worldX,
          opticalAxisY - 0.14,
          -0.06
        ),
        sensorLandingPos: new THREE.Vector3(sensorX, opticalAxisY + 0.04, 0.06),
        colorHex: 0xfffbeb,
      },
      {
        preset: 'background',
        sourcePos: new THREE.Vector3(
          SCENE_SUBJECTS.background.worldX,
          opticalAxisY + 0.44,
          -0.44
        ),
        sensorLandingPos: new THREE.Vector3(sensorX, opticalAxisY - 0.28, 0.42),
        colorHex: 0xf0f9ff,
      },
    ];

    const dotGeo = new THREE.SphereGeometry(0.03, 12, 12);

    for (const cfg of bundleConfigs) {
      const segmentCount = RAYS_PER_BUNDLE * (POINTS_PER_RAY - 1);
      const positions = new Float32Array(segmentCount * 2 * 3);
      const posAttr = new THREE.BufferAttribute(positions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', posAttr);

      const mat = new THREE.LineBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });

      const lines = new THREE.LineSegments(lineGeo, mat);
      lines.frustumCulled = false;
      lines.renderOrder = 14;
      this.group.add(lines);

      const sourceDotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const sourceDot = new THREE.Mesh(dotGeo, sourceDotMat);
      sourceDot.position.copy(cfg.sourcePos);
      this.group.add(sourceDot);

      const ringPts: THREE.Vector3[] = [];
      const ringSegs = 32;
      for (let i = 0; i < ringSegs; i++) {
        const theta = (i / ringSegs) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(0, Math.cos(theta), Math.sin(theta)));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const sensorRing = new THREE.LineLoop(ringGeo, ringMat);
      sensorRing.position.set(sensorX + 0.025, cfg.sensorLandingPos.y, cfg.sensorLandingPos.z);
      sensorRing.renderOrder = 15;
      this.group.add(sensorRing);

      const sensorDot = new THREE.Mesh(
        dotGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
      );
      sensorDot.position.set(sensorX + 0.025, cfg.sensorLandingPos.y, cfg.sensorLandingPos.z);
      sensorDot.renderOrder = 16;
      this.group.add(sensorDot);

      this.bundles.set(cfg.preset, {
        config: cfg,
        lines,
        positionAttr: posAttr,
        material: mat,
        sourceDot,
        sensorRing,
        sensorDot,
      });
    }
  }

  public update(
    focusDistanceCm: number,
    apertureRadiusNormalized: number,
    lensElementXPositions: readonly number[],
    opticalAxisY: number,
    sensorX: number
  ) {
    // Keep ray cone comfortably inside the clear glass aperture (radius 0.68 max) so rays never clip the embossed black rings
    const maxPupilRadius = 0.66 * apertureRadiusNormalized;

    // Smooth optical refraction envelope through the 7 elements
    const elementEnvelopeScales = [0.92, 0.96, 0.84, 0.72, 0.78, 0.82, 0.74];

    for (const [preset, bundle] of this.bundles) {
      const subj = SCENE_SUBJECTS[preset];
      const { sourcePos, sensorLandingPos } = bundle.config;

      const deltaCm = subj.distanceCm - focusDistanceCm;
      const defocusShiftX = THREE.MathUtils.clamp(deltaCm * 0.022, -1.35, 1.35);
      const rearLensX = lensElementXPositions[6];

      const focalX = sensorX + defocusShiftX;
      const denom = Math.max(0.45, rearLensX - focalX);
      const sensorDefocusFactor = (sensorX - focalX) / denom;

      const absDelta = Math.abs(deltaCm);
      const isSharp = absDelta <= 2.5;
      bundle.material.opacity = isSharp ? 0.78 : 0.34;
      bundle.sourceDot.scale.setScalar(isSharp ? 1.3 : 0.85);

      const cocWorldRadius = Math.max(
        0.015,
        Math.abs(sensorDefocusFactor) * maxPupilRadius * 0.78
      );
      bundle.sensorRing.scale.set(1, cocWorldRadius, cocWorldRadius);
      (bundle.sensorRing.material as THREE.LineBasicMaterial).opacity = isSharp ? 0.95 : 0.65;
      bundle.sensorDot.scale.setScalar(isSharp ? 1.3 : 0.75);

      const posArray = bundle.positionAttr.array as Float32Array;
      let writeIdx = 0;

      const apertureX = lensElementXPositions[3];

      for (let r = 0; r < RAYS_PER_BUNDLE; r++) {
        const rayAngle = this.rayAngles[r];
        const rayRad = maxPupilRadius * rayAngle.radiusScale;
        const offsetY = rayAngle.cos * rayRad;
        const offsetZ = rayAngle.sin * rayRad;

        let prevX = sourcePos.x;
        let prevY = sourcePos.y;
        let prevZ = sourcePos.z;

        for (let el = 0; el < 7; el++) {
          const elX = lensElementXPositions[el];
          const envScale = elementEnvelopeScales[el];

          let chiefY: number;
          let chiefZ: number;
          if (el <= 3) {
            const tFront = (sourcePos.x - elX) / Math.max(0.1, sourcePos.x - apertureX);
            chiefY = THREE.MathUtils.lerp(sourcePos.y, opticalAxisY, tFront * 0.85);
            chiefZ = THREE.MathUtils.lerp(sourcePos.z, 0, tFront * 0.85);
          } else {
            const tRear = (apertureX - elX) / Math.max(0.1, apertureX - sensorX);
            chiefY = THREE.MathUtils.lerp(opticalAxisY, sensorLandingPos.y, tRear);
            chiefZ = THREE.MathUtils.lerp(0, sensorLandingPos.z, tRear);
          }

          const curX = elX;
          const curY = chiefY + offsetY * envScale;
          const curZ = chiefZ + offsetZ * envScale;

          posArray[writeIdx++] = prevX;
          posArray[writeIdx++] = prevY;
          posArray[writeIdx++] = prevZ;
          posArray[writeIdx++] = curX;
          posArray[writeIdx++] = curY;
          posArray[writeIdx++] = curZ;

          prevX = curX;
          prevY = curY;
          prevZ = curZ;
        }

        const endX = sensorX + 0.02;
        const endY = sensorLandingPos.y + offsetY * 0.78 * sensorDefocusFactor;
        const endZ = sensorLandingPos.z + offsetZ * 0.78 * sensorDefocusFactor;

        posArray[writeIdx++] = prevX;
        posArray[writeIdx++] = prevY;
        posArray[writeIdx++] = prevZ;
        posArray[writeIdx++] = endX;
        posArray[writeIdx++] = endY;
        posArray[writeIdx++] = endZ;
      }

      bundle.positionAttr.needsUpdate = true;
    }
  }
}
