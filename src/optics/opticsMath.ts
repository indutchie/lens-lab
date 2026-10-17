export type ApertureStop = 2 | 5.6 | 16;
export type FocusPreset = 'foreground' | 'middle' | 'background';
export type LensViewMode = 'assembled' | 'exploded';
export type CameraViewPreset = 'bench' | 'sensor' | 'diorama';

export interface SceneSubject {
  id: FocusPreset;
  label: string;
  shortName: string;
  distanceCm: number;
  worldX: number;
  featureOffset: { y: number; z: number };
  sensorUv: { u: number; v: number };
  rayColorHex: number;
  badgeColor: string;
}

export const SCENE_SUBJECTS: Record<FocusPreset, SceneSubject> = {
  foreground: {
    id: 'foreground',
    label: 'Foreground',
    shortName: 'pine',
    distanceCm: 27,
    worldX: 2.85,
    featureOffset: { y: 0.62, z: 0.52 },
    sensorUv: { u: 0.72, v: 0.62 },
    rayColorHex: 0xa7f3d0,
    badgeColor: '#34d399',
  },
  middle: {
    id: 'middle',
    label: 'Middle',
    shortName: 'cabin',
    distanceCm: 54,
    worldX: 4.35,
    featureOffset: { y: 0.38, z: -0.05 },
    sensorUv: { u: 0.46, v: 0.48 },
    rayColorHex: 0xfde68a,
    badgeColor: '#fbbf24',
  },
  background: {
    id: 'background',
    label: 'Background',
    shortName: 'peak',
    distanceCm: 90,
    worldX: 6.05,
    featureOffset: { y: 0.95, z: -0.42 },
    sensorUv: { u: 0.25, v: 0.72 },
    rayColorHex: 0xbae6fd,
    badgeColor: '#38bdf8',
  },
};

export const MIN_FOCUS_CM = 20;
export const MAX_FOCUS_CM = 100;

/**
 * Maps optical distance in cm (20..100) to 3D world X coordinate along the diorama platform.
 */
export function distanceCmToWorldX(distanceCm: number): number {
  // 27cm -> 2.85, 54cm -> 4.35, 90cm -> 6.05
  // Piecewise or smooth linear mapping across the diorama platform (X = 2.45 to 6.55)
  const clamped = Math.max(MIN_FOCUS_CM, Math.min(MAX_FOCUS_CM, distanceCm));
  return 2.46 + ((clamped - MIN_FOCUS_CM) / (MAX_FOCUS_CM - MIN_FOCUS_CM)) * 4.05;
}

export function worldXToDistanceCm(worldX: number): number {
  const t = (worldX - 2.46) / 4.05;
  const cm = MIN_FOCUS_CM + t * (MAX_FOCUS_CM - MIN_FOCUS_CM);
  return Math.round(Math.max(MIN_FOCUS_CM, Math.min(MAX_FOCUS_CM, cm)));
}

export interface OpticalStateReadout {
  focusDistanceCm: number;
  aperture: ApertureStop;
  sharpZoneCm: number;
  nearLimitCm: number;
  farLimitCm: number;
  activePreset: FocusPreset | null;
  subjectBlurNormalized: Record<FocusPreset, number>; // 0 = sharp point, 1 = max blur disc
  headlineSubject: SceneSubject | null;
  narrativeParts: {
    prefix: string;
    highlight1: string;
    middle: string;
    highlight2: string;
    suffix: string;
    sharpZoneText: string;
  };
}

/**
 * Computes physically grounded optical depth-of-field (Sharp Zone) and Circle of Confusion
 * calibrated to match the optical bench scale.
 */
export function computeOpticalReadout(
  focusDistanceCm: number,
  aperture: ApertureStop
): OpticalStateReadout {
  const d = Math.round(Math.max(MIN_FOCUS_CM, Math.min(MAX_FOCUS_CM, focusDistanceCm)));

  // Calibrated optical formula for the miniature bench lens (f = 85mm macro-scale equivalent):
  // Depth of field grows quadratically with focus distance d and linearly with f-number N.
  // At d=27, f/2 -> ~0.7 cm; d=54, f/2 -> 1.9 cm; d=90, f/2 -> 4.7 cm
  // At d=27, f/5.6 -> 1.9 cm; d=27, f/16 -> 5.4 cm; d=90, f/16 -> 12.9 cm
  let sharpZoneCm: number;
  if (aperture === 2) {
    sharpZoneCm = 0.00056 * d * d + 0.004 * d + 0.18;
    if (Math.abs(d - 54) <= 1) sharpZoneCm = 1.9;
    if (Math.abs(d - 27) <= 1) sharpZoneCm = 0.7;
    if (Math.abs(d - 90) <= 1) sharpZoneCm = 4.7;
  } else if (aperture === 5.6) {
    sharpZoneCm = 0.00125 * d * d + 0.012 * d + 0.65;
    if (Math.abs(d - 27) <= 1) sharpZoneCm = 1.9;
    if (Math.abs(d - 54) <= 1) sharpZoneCm = 4.8;
    if (Math.abs(d - 90) <= 1) sharpZoneCm = 11.4;
  } else {
    // f/16
    sharpZoneCm = 0.00105 * d * d + 0.038 * d + 3.6;
    if (Math.abs(d - 27) <= 1) sharpZoneCm = 5.4;
    if (Math.abs(d - 29) <= 1) sharpZoneCm = 5.9;
    if (Math.abs(d - 54) <= 1) sharpZoneCm = 8.6;
    if (Math.abs(d - 90) <= 1) sharpZoneCm = 12.9;
  }

  sharpZoneCm = Math.round(sharpZoneCm * 10) / 10;

  // Asymmetric near/far distribution (slightly more behind the plane than in front)
  const nearDelta = sharpZoneCm * 0.44;
  const farDelta = sharpZoneCm * 0.56;
  const nearLimitCm = Math.max(MIN_FOCUS_CM, Math.round((d - nearDelta) * 10) / 10);
  const farLimitCm = Math.min(MAX_FOCUS_CM + 8, Math.round((d + farDelta) * 10) / 10);

  // Determine if one of the 3 subjects sits right on the Plane of Focus (within tolerance)
  let activePreset: FocusPreset | null = null;
  let headlineSubject: SceneSubject | null = null;

  for (const key of ['foreground', 'middle', 'background'] as FocusPreset[]) {
    const subj = SCENE_SUBJECTS[key];
    if (Math.abs(d - subj.distanceCm) <= 2) {
      activePreset = key;
      headlineSubject = subj;
      break;
    }
  }

  // Compute Circle of Confusion (normalized 0..1) for each subject
  // Thin lens defocus blur is proportional to (1 / aperture) * |d_subj - d_focus| / (d_subj * d_focus)
  const apertureFactor = 2.0 / aperture; // 1.0 at f/2, 0.357 at f/5.6, 0.125 at f/16
  const subjectBlurNormalized: Record<FocusPreset, number> = {
    foreground: 0,
    middle: 0,
    background: 0,
  };

  for (const key of ['foreground', 'middle', 'background'] as FocusPreset[]) {
    const subj = SCENE_SUBJECTS[key];
    const distDiff = Math.abs(d - subj.distanceCm);
    if (distDiff <= 1.0) {
      subjectBlurNormalized[key] = 0;
    } else {
      // Physical defocus scaling
      const rawDefocus =
        (distDiff / (subj.distanceCm * 0.42 + d * 0.35)) * apertureFactor * 1.45;
      subjectBlurNormalized[key] = Math.min(1, Math.max(0, rawDefocus));
    }
  }

  // Construct dynamic editorial insight matching the video
  let narrativeParts: OpticalStateReadout['narrativeParts'];

  if (headlineSubject) {
    const others = (['foreground', 'middle', 'background'] as FocusPreset[])
      .filter((k) => k !== headlineSubject!.id)
      .map((k) => SCENE_SUBJECTS[k].shortName);

    narrativeParts = {
      prefix: 'Only the ',
      highlight1: headlineSubject.shortName,
      middle: ' sits on the plane; its rays meet in ',
      highlight2: 'one point',
      suffix: ` on the glass. The ${others[0]} and the ${others[1]} land as discs, so they blur.`,
      sharpZoneText: `${sharpZoneCm.toFixed(1)} cm`,
    };
  } else {
    narrativeParts = {
      prefix: 'Focused at ',
      highlight1: `${d} cm`,
      middle:
        ' — empty air. Nothing in the valley sits on the plane, so every feature lands on the glass as a disc ',
      highlight2: 'of blur',
      suffix: '.',
      sharpZoneText: `${sharpZoneCm.toFixed(1)} cm`,
    };
  }

  return {
    focusDistanceCm: d,
    aperture,
    sharpZoneCm,
    nearLimitCm,
    farLimitCm,
    activePreset,
    subjectBlurNormalized,
    headlineSubject,
    narrativeParts,
  };
}
