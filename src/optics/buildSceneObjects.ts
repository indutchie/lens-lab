import * as THREE from 'three';
import {
  ConsoleFilmstripRenderer,
  createConsoleApertureDialTexture,
  createConsoleApertureLabelTexture,
  createGalleryWallPrintTexture,
  createOpticalRailRulerTexture,
  createTiledFloorTexture,
  SensorGroundGlassRenderer,
} from './proceduralTextures';
import { ApertureStop, distanceCmToWorldX } from './opticsMath';

export interface OpticalBenchRig {
  rootGroup: THREE.Group;
  opticalAxisY: number;
  sensorX: number;
  focusRingCollider: THREE.Mesh;
  sensorFrameCollider: THREE.Mesh;
  consoleSliderCollider: THREE.Mesh;
  anchors: {
    imagePlane: THREE.Vector3;
    focusRing: THREE.Vector3;
    planeOfFocus: THREE.Vector3;
    sharpZone: THREE.Vector3;
  };
  updateFrame: (
    dt: number,
    targetFocusCm: number,
    targetAperture: ApertureStop,
    targetExploded: boolean
  ) => {
    currentFocusCm: number;
    currentApertureRadiusNorm: number;
    lensElementWorldX: readonly number[];
  };
}

/**
 * Generates a visibly bulged spherical lens profile using LatheGeometry around the X-axis.
 */
function createOpticalLensGeometry(
  radius: number,
  edgeThickness: number,
  frontBulge: number,
  rearBulge: number
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = t * radius;
    const sag = frontBulge * (1 - t * t);
    pts.push(new THREE.Vector2(r, edgeThickness * 0.5 + sag));
  }

  pts.push(new THREE.Vector2(radius, -edgeThickness * 0.5));

  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = t * radius;
    const sag = rearBulge * (1 - t * t);
    pts.push(new THREE.Vector2(r, -edgeThickness * 0.5 - sag));
  }

  const lathe = new THREE.LatheGeometry(pts, 56);
  lathe.rotateZ(-Math.PI / 2);
  lathe.computeVertexNormals();
  return lathe;
}

/**
 * Builds a lush multi-part indoor botanical plant in a ceramic architectural planter pot
 * with natural deep forest-emerald foliage and a subtle warm accent light.
 */
function createGalleryPlantPotGroup(): THREE.Group {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.35, 1.7),
    new THREE.MeshStandardMaterial({
      color: 0x1b1f28,
      roughness: 0.55,
      metalness: 0.15,
    })
  );
  plinth.position.y = 0.675;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const potPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.42, 0),
    new THREE.Vector2(0.56, 0.45),
    new THREE.Vector2(0.58, 0.92),
    new THREE.Vector2(0.52, 1.05),
    new THREE.Vector2(0.47, 1.05),
    new THREE.Vector2(0.47, 0.92),
  ];
  const potGeo = new THREE.LatheGeometry(potPts, 36);
  const potMat = new THREE.MeshStandardMaterial({
    color: 0xc9bfb0,
    roughness: 0.48,
    metalness: 0.05,
  });
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.position.y = 1.35;
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  group.add(potMesh);

  const potBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.568, 0.558, 0.06, 36, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x9c682c,
      metalness: 0.84,
      roughness: 0.25,
    })
  );
  potBand.position.y = 1.88;
  group.add(potBand);

  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 28),
    new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.95 })
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 2.32;
  group.add(soil);

  const leafCount = 14;
  for (let i = 0; i < leafCount; i++) {
    const stemGroup = new THREE.Group();
    stemGroup.position.y = 2.3;
    const angle = (i / leafCount) * Math.PI * 2 + (i % 2) * 0.2;
    const tier = i % 3;
    const h = 0.65 + (2 - tier) * 0.28;
    const spread = 0.22 + tier * 0.24;

    const stemCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.cos(angle) * spread * 0.5,
        h * 0.65,
        Math.sin(angle) * spread * 0.5
      ),
      new THREE.Vector3(Math.cos(angle) * spread, h, Math.sin(angle) * spread)
    );
    const stemGeo = new THREE.TubeGeometry(stemCurve, 12, 0.018, 8, false);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x1e3d1b,
      roughness: 0.65,
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemGroup.add(stemMesh);

    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.16, 0.12, 0.14, 0.34);
    leafShape.quadraticCurveTo(0.06, 0.48, 0, 0.54);
    leafShape.quadraticCurveTo(-0.06, 0.48, -0.14, 0.34);
    leafShape.quadraticCurveTo(-0.16, 0.12, 0, 0);

    const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    // Deep natural botanical foliage greens
    const leafShades = [0x1f4724, 0x26542b, 0x193b1d];
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafShades[i % 3],
      roughness: 0.45,
      metalness: 0.04,
    });
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(
      Math.cos(angle) * spread,
      h,
      Math.sin(angle) * spread
    );
    leafMesh.rotation.y = -angle + Math.PI / 2;
    leafMesh.rotation.x = 0.55 + tier * 0.22;
    leafMesh.castShadow = true;
    stemGroup.add(leafMesh);

    group.add(stemGroup);
  }

  // Dedicated subtle museum downlight over the plant pot (warm tungsten)
  const plantSpot = new THREE.PointLight(0xffd194, 1.45, 6.0);
  plantSpot.position.set(0.2, 4.2, 0.5);
  group.add(plantSpot);

  return group;
}

/**
 * Builds the Showpiece Camera on a Lighter-Black Display Block with the Small Wall Structure & Warm Light.
 */
function createShowpieceCameraDisplayUnit(): THREE.Group {
  const unitGroup = new THREE.Group();

  const blockMat = new THREE.MeshStandardMaterial({
    color: 0x1f242e,
    roughness: 0.48,
    metalness: 0.18,
  });
  const pedestalBlock = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.85, 2.1),
    blockMat
  );
  pedestalBlock.position.set(0, 1.425, 0);
  pedestalBlock.castShadow = true;
  pedestalBlock.receiveShadow = true;
  unitGroup.add(pedestalBlock);

  const blockBaseTrim = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 0.05, 2.14),
    new THREE.MeshStandardMaterial({
      color: 0xa67132,
      metalness: 0.85,
      roughness: 0.25,
    })
  );
  blockBaseTrim.position.set(0, 0.025, 0);
  unitGroup.add(blockBaseTrim);

  // Small Wall-Type Backdrop Structure with a built-in Light Fixture
  const wallStructureMat = new THREE.MeshStandardMaterial({
    color: 0x171b24,
    roughness: 0.55,
    metalness: 0.15,
  });
  const smallWall = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 4.35, 0.28),
    wallStructureMat
  );
  smallWall.position.set(0, 2.175, -1.12);
  smallWall.castShadow = true;
  smallWall.receiveShadow = true;
  unitGroup.add(smallWall);

  const lightFixtureHousing = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.12, 0.32),
    new THREE.MeshStandardMaterial({
      color: 0x11141b,
      roughness: 0.3,
      metalness: 0.6,
    })
  );
  lightFixtureHousing.position.set(0, 3.85, -0.88);
  unitGroup.add(lightFixtureHousing);

  const glowingLightStrip = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.055, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xffde9e })
  );
  glowingLightStrip.position.set(0, 3.81, -0.88);
  unitGroup.add(glowingLightStrip);

  // Warm indoor gallery sconce light casting onto the showpiece camera and small wall
  const displayLight = new THREE.PointLight(0xffcb80, 2.8, 7.5);
  displayLight.position.set(0, 3.65, -0.45);
  unitGroup.add(displayLight);

  // Showpiece Camera sitting directly on the pedestal block (no glass cover box)
  const camGroup = new THREE.Group();
  camGroup.position.set(0, 3.16, 0.1);
  camGroup.rotation.y = -0.55;

  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.58, 0.44),
    new THREE.MeshStandardMaterial({
      color: 0x181b22,
      roughness: 0.35,
      metalness: 0.65,
    })
  );
  camBody.castShadow = true;
  camBody.receiveShadow = true;
  camGroup.add(camBody);

  const shutterDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24),
    new THREE.MeshStandardMaterial({
      color: 0x9c682c,
      metalness: 0.85,
      roughness: 0.22,
    })
  );
  shutterDial.position.set(0.28, 0.32, 0);
  shutterDial.castShadow = true;
  camGroup.add(shutterDial);

  const camLensBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.36, 32),
    new THREE.MeshStandardMaterial({
      color: 0x101318,
      roughness: 0.3,
      metalness: 0.7,
    })
  );
  camLensBarrel.rotation.x = Math.PI / 2;
  camLensBarrel.position.set(0, -0.02, 0.34);
  camLensBarrel.castShadow = true;
  camGroup.add(camLensBarrel);

  const cyanLensRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.018, 16, 36),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  cyanLensRing.position.set(0, -0.02, 0.51);
  camGroup.add(cyanLensRing);

  const secondaryRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.014, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
  );
  secondaryRing.position.set(0.32, 0.06, 0.24);
  camGroup.add(secondaryRing);

  unitGroup.add(camGroup);

  return unitGroup;
}

export function buildOpticalBenchScene(
  scene: THREE.Scene,
  maxAnisotropy: number,
  sensorRenderer: SensorGroundGlassRenderer,
  filmstripRenderer: ConsoleFilmstripRenderer
): OpticalBenchRig {
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const opticalAxisY = 1.32;
  const sensorX = -5.18;

  // ============================================================================
  // 1. DARK MOODY MUSEUM GALLERY ENVIRONMENT ENHANCED BY ROOM LIGHT FIXTURES
  // ============================================================================
  const envGroup = new THREE.Group();
  rootGroup.add(envGroup);

  // Creamy stone gallery floor tiles reflecting the indoor room lights & receiving crisp shadows
  const floorTex = createTiledFloorTexture(maxAnisotropy);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.32,
    metalness: 0.08,
  });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2.45;
  floorMesh.receiveShadow = true;
  envGroup.add(floorMesh);

  // Deep Bluish-Grey Museum Back Wall with Vertical Architectural Panel Stripes & Top Linear Cove Light (matching Image 3)
  const bluishGreyWallMat = new THREE.MeshStandardMaterial({
    color: 0x1c222e,
    roughness: 0.68,
    metalness: 0.08,
  });
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(30, 12, 0.4),
    bluishGreyWallMat
  );
  backWall.position.set(0, 3.2, -6.8);
  backWall.receiveShadow = true;
  envGroup.add(backWall);

  // Vertical Architectural Stripes / Panel Seams on the Back Wall (matching Image 3)
  const seamGrooveMat = new THREE.MeshStandardMaterial({
    color: 0x0f131a,
    roughness: 0.78,
    metalness: 0.12,
  });
  const seamBevelMat = new THREE.MeshStandardMaterial({
    color: 0x2e3747,
    roughness: 0.45,
    metalness: 0.2,
  });
  const seamSpacing = 1.75;
  for (let sx = -14.0; sx <= 14.0; sx += seamSpacing) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 9.2, 0.03),
      seamGrooveMat
    );
    groove.position.set(sx, 2.25, -6.595);
    envGroup.add(groove);

    const bevelEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 9.2, 0.025),
      seamBevelMat
    );
    bevelEdge.position.set(sx + 0.022, 2.25, -6.597);
    envGroup.add(bevelEdge);
  }

  // Top Horizontal Architectural Cornice & Aesthetic Golden-Amber Linear Cove Light Bar (matching Image 3)
  const topCorniceLedge = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.28, 0.62),
    new THREE.MeshStandardMaterial({
      color: 0x11151d,
      roughness: 0.4,
      metalness: 0.35,
    })
  );
  topCorniceLedge.position.set(0, 6.72, -6.56);
  envGroup.add(topCorniceLedge);

  const topHorizontalLightBar = new THREE.Mesh(
    new THREE.BoxGeometry(29.8, 0.075, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    })
  );
  topHorizontalLightBar.position.set(0, 6.55, -6.48);
  envGroup.add(topHorizontalLightBar);

  // Aesthetic golden-amber linear grazing light washing down the vertical-striped wall
  const wallTopCoveLight = new THREE.RectAreaLight(0xf59e0b, 3.6, 28.0, 0.5);
  wallTopCoveLight.position.set(0, 6.48, -6.32);
  wallTopCoveLight.lookAt(0, 2.2, -6.75);
  envGroup.add(wallTopCoveLight);

  // Soft warm golden-yellow gradient pools along the wall cove to enrich the vertical wall stripes
  const coveGlowPositions = [-7.5, -2.5, 2.5, 7.5];
  for (const cx of coveGlowPositions) {
    const covePoint = new THREE.PointLight(0xf59e0b, 1.4, 7.5);
    covePoint.position.set(cx, 6.4, -6.22);
    envGroup.add(covePoint);
  }

  // Skirting board with goldenish running line where the bluish-grey wall meets the creamy floor tiles
  const skirtingBoard = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.26, 0.46),
    new THREE.MeshStandardMaterial({
      color: 0x11151d,
      roughness: 0.45,
      metalness: 0.2,
    })
  );
  skirtingBoard.position.set(0, -2.32, -6.78);
  envGroup.add(skirtingBoard);

  const goldenSkirtingLine = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.045, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x92400e,
      emissiveIntensity: 0.4,
    })
  );
  goldenSkirtingLine.position.set(0, -2.19, -6.77);
  envGroup.add(goldenSkirtingLine);

  // 3 Framed Plane-of-Focus Optical Study Paintings + Physical Gallery Picture-Light Sconces above each frame
  const frameOuterMat = new THREE.MeshStandardMaterial({
    color: 0x12151c,
    roughness: 0.35,
    metalness: 0.55,
  });
  const sconceBrassMat = new THREE.MeshStandardMaterial({
    color: 0x9c682c,
    metalness: 0.85,
    roughness: 0.25,
  });

  for (let i = 0; i < 3; i++) {
    const px = -2.6 + i * 2.2;
    const printGroup = new THREE.Group();
    printGroup.position.set(px, 3.7, -6.55);

    const frameBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 1.92, 0.07),
      frameOuterMat
    );
    frameBox.castShadow = true;
    frameBox.receiveShadow = true;
    printGroup.add(frameBox);

    const printTex = createGalleryWallPrintTexture(
      i as 0 | 1 | 2,
      maxAnisotropy
    );
    const printFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.42, 1.78),
      new THREE.MeshStandardMaterial({
        map: printTex,
        roughness: 0.4,
        metalness: 0.05,
      })
    );
    printFace.position.z = 0.04;
    printGroup.add(printFace);

    // Physical Museum Picture-Light Sconce above the frame
    const sconceArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.32),
      sconceBrassMat
    );
    sconceArm.position.set(0, 1.12, 0.12);
    printGroup.add(sconceArm);

    const sconceHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 0.82, 16),
      sconceBrassMat
    );
    sconceHood.rotation.z = Math.PI / 2;
    sconceHood.position.set(0, 1.1, 0.28);
    printGroup.add(sconceHood);

    const sconceBulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.025, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 2.0,
      })
    );
    sconceBulb.position.set(0, 1.07, 0.28);
    printGroup.add(sconceBulb);

    // Warm golden pool of gallery light illuminating this painting & the wall around it
    const artLight = new THREE.PointLight(0xf59e0b, 1.5, 5.0);
    artLight.position.set(0, 0.95, 0.45);
    printGroup.add(artLight);

    envGroup.add(printGroup);
  }

  // Left Side (-X): Beautiful Architectural Plant Pot
  const leftPlantPot = createGalleryPlantPotGroup();
  leftPlantPot.position.set(-8.6, -2.45, -3.4);
  envGroup.add(leftPlantPot);

  // Opposite Side (+X): Lighter-Black Display Block with Showpiece Camera + Small Wall Structure with Light (white box removed!)
  const cameraDisplayRight = createShowpieceCameraDisplayUnit();
  cameraDisplayRight.position.set(7.8, -2.45, -3.8);
  envGroup.add(cameraDisplayRight);

  // Overhead Architectural Gallery Track-Light Rail, Suspension Hangers & Spotlight Canisters
  const trackRailGroup = new THREE.Group();
  trackRailGroup.position.set(0.5, 6.65, 1.85);
  const trackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x11141c,
    roughness: 0.35,
    metalness: 0.7,
  });

  const trackBar = new THREE.Mesh(
    new THREE.BoxGeometry(15.5, 0.08, 0.14),
    trackMetalMat
  );
  trackRailGroup.add(trackBar);

  // Upper structural tie-beam & vertical suspension hanger rods with brass turnbuckles so the track light hangs from above
  const upperCeilingBeam = new THREE.Mesh(
    new THREE.BoxGeometry(16.0, 0.18, 0.32),
    trackMetalMat
  );
  upperCeilingBeam.position.set(0, 5.2, 0);
  trackRailGroup.add(upperCeilingBeam);

  const hangerXPositions = [-6.4, -2.2, 2.2, 6.4];
  for (const hx of hangerXPositions) {
    // Vertical steel suspension rod from trackBar (y=0) up to upperCeilingBeam (y=5.2)
    const hangerRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 5.2, 16),
      trackMetalMat
    );
    hangerRod.position.set(hx, 2.6, 0);
    trackRailGroup.add(hangerRod);

    // Brass turnbuckle coupler at the track junction
    const brassCoupler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16),
      sconceBrassMat
    );
    brassCoupler.position.set(hx, 0.14, 0);
    trackRailGroup.add(brassCoupler);

    // Upper ceiling canopy collar
    const ceilingCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.08, 0.12, 20),
      sconceBrassMat
    );
    ceilingCollar.position.set(hx, 5.08, 0);
    trackRailGroup.add(ceilingCollar);

    // Diagonal cross-brace cable for industrial optical-lab authenticity
    const braceRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.45, 10),
      trackMetalMat
    );
    braceRod.position.set(hx + (hx < 0 ? 0.45 : -0.45), 0.55, 0);
    braceRod.rotation.z = hx < 0 ? -0.58 : 0.58;
    trackRailGroup.add(braceRod);
  }

  const trackCanisterCoords = [
    { x: -5.2, rotZ: -0.12 },
    { x: -1.1, rotZ: 0.05 },
    { x: 1.2, rotZ: -0.08 },
    { x: 4.1, rotZ: 0.1 },
  ];
  for (const tc of trackCanisterCoords) {
    const canGroup = new THREE.Group();
    canGroup.position.set(tc.x, -0.18, 0);
    canGroup.rotation.z = tc.rotZ;
    canGroup.rotation.x = -0.32;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.22, 12),
      sconceBrassMat
    );
    stem.position.y = 0.12;
    canGroup.add(stem);

    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.38, 24),
      new THREE.MeshStandardMaterial({
        color: 0x151922,
        roughness: 0.3,
        metalness: 0.65,
      })
    );
    canGroup.add(housing);

    const lensDisk = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd690 })
    );
    lensDisk.rotation.x = Math.PI / 2;
    lensDisk.position.y = -0.192;
    canGroup.add(lensDisk);

    trackRailGroup.add(canGroup);
  }
  envGroup.add(trackRailGroup);

  // ============================================================================
  // 2. THE OPTICAL BENCH CONSOLE & LINEAR RAIL
  // ============================================================================
  const benchGroup = new THREE.Group();
  rootGroup.add(benchGroup);

  const consoleBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1c2029,
    roughness: 0.44,
    metalness: 0.26,
  });
  const consoleDarkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x12151c,
    roughness: 0.32,
    metalness: 0.45,
  });

  // Golden-Brown Bronze Material for Lens Gear Rings & Trim (matching frame 00:06)
  const goldenBrownBrassMat = new THREE.MeshPhysicalMaterial({
    color: 0x9e682c,
    metalness: 0.85,
    roughness: 0.24,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
  });
  const darkGoldenBrownMat = new THREE.MeshStandardMaterial({
    color: 0x754b1c,
    metalness: 0.82,
    roughness: 0.34,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.88,
    roughness: 0.2,
  });

  const consoleChassis = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 2.35, 3.6),
    consoleBodyMat
  );
  consoleChassis.position.set(0.2, -1.22, 0);
  consoleChassis.receiveShadow = true;
  consoleChassis.castShadow = true;
  benchGroup.add(consoleChassis);

  const topDeck = new THREE.Mesh(
    new THREE.BoxGeometry(14.8, 0.12, 3.75),
    consoleDarkTrimMat
  );
  topDeck.position.set(0.2, -0.02, 0);
  topDeck.receiveShadow = true;
  topDeck.castShadow = true;
  benchGroup.add(topDeck);

  const frontBrassStrip = new THREE.Mesh(
    new THREE.BoxGeometry(14.82, 0.045, 0.06),
    goldenBrownBrassMat
  );
  frontBrassStrip.position.set(0.2, -0.02, 1.86);
  benchGroup.add(frontBrassStrip);

  const bottomBrassStrip = new THREE.Mesh(
    new THREE.BoxGeometry(14.64, 0.04, 3.64),
    goldenBrownBrassMat
  );
  bottomBrassStrip.position.set(0.2, -2.38, 0);
  benchGroup.add(bottomBrassStrip);

  // Left Console Feature: Master Camera Aperture Iris Unit (matching Reference Image 4) + Clean Lower Text Plate
  const leftApertureGroup = new THREE.Group();
  leftApertureGroup.position.set(-5.05, -1.04, 1.81);

  const leftApertureBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.055, 56),
    new THREE.MeshStandardMaterial({
      color: 0xccc6b6,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  leftApertureBezel.rotation.x = Math.PI / 2;
  leftApertureGroup.add(leftApertureBezel);

  const masterIrisTex = createConsoleApertureDialTexture(
    'master',
    maxAnisotropy
  );
  const leftApertureFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.645, 56),
    new THREE.MeshBasicMaterial({ map: masterIrisTex })
  );
  leftApertureFace.position.z = 0.03;
  leftApertureGroup.add(leftApertureFace);

  // Clean technical text label placed neatly beneath the left aperture ring
  const leftLabelTex = createConsoleApertureLabelTexture(
    'IRIS · 50MM',
    true,
    maxAnisotropy
  );
  const leftLabelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.28),
    new THREE.MeshBasicMaterial({ map: leftLabelTex, transparent: true })
  );
  leftLabelMesh.position.set(0, -0.82, 0.02);
  leftApertureGroup.add(leftLabelMesh);

  benchGroup.add(leftApertureGroup);

  // Center Console Feature: Recessed 5-Frame Focus Preview Bay & "50mm F/2 OPTICAL BENCH" Linear Markings
  const bayRecess = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 1.72, 0.12),
    consoleDarkTrimMat
  );
  bayRecess.position.set(-0.25, -1.16, 1.78);
  benchGroup.add(bayRecess);

  const filmstripPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6.82, 1.62),
    new THREE.MeshBasicMaterial({ map: filmstripRenderer.texture })
  );
  filmstripPlane.position.set(-0.25, -1.16, 1.845);
  benchGroup.add(filmstripPlane);

  const scrubHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.22, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  scrubHandle.position.set(-0.25, -1.62, 1.87);
  benchGroup.add(scrubHandle);

  const consoleSliderCollider = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.68, 0.25),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  consoleSliderCollider.position.set(-0.25, -1.16, 1.88);
  benchGroup.add(consoleSliderCollider);

  // Right Console Feature: 3 Camera Aperture Iris Units (f/2, f/5.6, f/16 matching Reference Image 5) + Clean Lower Labels
  const rightApertureStops: ApertureStop[] = [2, 5.6, 16];
  const rightApertureRings: THREE.Mesh[] = [];

  rightApertureStops.forEach((stop, i) => {
    const dialGroup = new THREE.Group();
    dialGroup.position.set(4.25 + i * 0.96, -1.04, 1.81);

    const ringBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.055, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0b0e14,
        roughness: 0.36,
        metalness: 0.45,
      })
    );
    ringBezel.rotation.x = Math.PI / 2;
    dialGroup.add(ringBezel);

    const apTex = createConsoleApertureDialTexture(stop, maxAnisotropy);
    const apFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.385, 48),
      new THREE.MeshBasicMaterial({ map: apTex })
    );
    apFace.position.z = 0.03;
    dialGroup.add(apFace);

    const activeHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.40, 0.432, 48),
      new THREE.MeshBasicMaterial({
        color: 0xc8923f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: stop === 2 ? 0.95 : 0.0,
      })
    );
    activeHalo.position.z = 0.032;
    dialGroup.add(activeHalo);
    rightApertureRings.push(activeHalo);

    // Neat f-stop label positioned cleanly below each aperture circle
    const stopLabelTex = createConsoleApertureLabelTexture(
      `f/${stop}`,
      false,
      maxAnisotropy
    );
    const stopLabelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.22),
      new THREE.MeshBasicMaterial({ map: stopLabelTex, transparent: true })
    );
    stopLabelMesh.position.set(0, -0.54, 0.02);
    dialGroup.add(stopLabelMesh);

    benchGroup.add(dialGroup);
  });

  // Precision Linear Optical Rail along the top of the bench
  const railLength = 13.4;
  const railBase = new THREE.Mesh(
    new THREE.BoxGeometry(railLength, 0.14, 1.15),
    consoleDarkTrimMat
  );
  railBase.position.set(0.2, 0.09, 0);
  railBase.receiveShadow = true;
  railBase.castShadow = true;
  benchGroup.add(railBase);

  const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, railLength, 20);
  rodGeo.rotateZ(Math.PI / 2);
  const frontRod = new THREE.Mesh(rodGeo, chromeMat);
  frontRod.position.set(0.2, 0.19, 0.42);
  frontRod.castShadow = true;
  frontRod.receiveShadow = true;
  benchGroup.add(frontRod);

  const backRod = new THREE.Mesh(rodGeo, chromeMat);
  backRod.position.set(0.2, 0.19, -0.42);
  backRod.castShadow = true;
  backRod.receiveShadow = true;
  benchGroup.add(backRod);

  const rulerTex = createOpticalRailRulerTexture(maxAnisotropy);
  const rulerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(railLength * 0.96, 0.22),
    new THREE.MeshBasicMaterial({ map: rulerTex })
  );
  rulerMesh.rotation.x = -Math.PI / 3;
  rulerMesh.position.set(0.3, 0.14, 0.64);
  benchGroup.add(rulerMesh);

  // ============================================================================
  // 3. IMAGE PLANE (GROUND GLASS SENSOR ASSEMBLY AT X = -5.18)
  // ============================================================================
  const sensorGroup = new THREE.Group();
  sensorGroup.position.set(sensorX, 0, 0);
  rootGroup.add(sensorGroup);

  const sensorCarriage = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.22, 1.35),
    consoleDarkTrimMat
  );
  sensorCarriage.position.set(0, 0.22, 0);
  sensorCarriage.castShadow = true;
  sensorCarriage.receiveShadow = true;
  sensorGroup.add(sensorCarriage);

  const sensorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.38,
    metalness: 0.48,
  });
  const bottomBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.16, 2.32),
    sensorFrameMat
  );
  bottomBar.position.set(0, 0.44, 0);
  bottomBar.castShadow = true;
  bottomBar.receiveShadow = true;
  sensorGroup.add(bottomBar);

  const clampCoords = [
    { y: opticalAxisY + 0.68, z: -0.96 },
    { y: opticalAxisY + 0.68, z: 0.96 },
    { y: opticalAxisY - 0.68, z: -0.96 },
    { y: opticalAxisY - 0.68, z: 0.96 },
  ];
  for (const c of clampCoords) {
    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.34, 0.32),
      sensorFrameMat
    );
    clamp.position.set(0, c.y, c.z);
    clamp.castShadow = true;
    clamp.receiveShadow = true;
    sensorGroup.add(clamp);
  }

  const postGeo = new THREE.BoxGeometry(0.12, 1.72, 0.14);
  const leftPost = new THREE.Mesh(postGeo, sensorFrameMat);
  leftPost.position.set(0, opticalAxisY, -1.04);
  leftPost.castShadow = true;
  leftPost.receiveShadow = true;
  sensorGroup.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, sensorFrameMat);
  rightPost.position.set(0, opticalAxisY, 1.04);
  rightPost.castShadow = true;
  rightPost.receiveShadow = true;
  sensorGroup.add(rightPost);

  const screenW = 1.96;
  const screenH = 1.52;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);

  const frontScreenMat = new THREE.MeshBasicMaterial({
    map: sensorRenderer.texture,
    transparent: true,
    opacity: 0.96,
  });
  const frontScreen = new THREE.Mesh(screenGeo, frontScreenMat);
  frontScreen.rotation.y = Math.PI / 2;
  frontScreen.position.set(0.015, opticalAxisY, 0);
  sensorGroup.add(frontScreen);

  const rearScreenMat = new THREE.MeshBasicMaterial({
    map: sensorRenderer.texture,
    transparent: true,
    opacity: 0.96,
  });
  const rearScreen = new THREE.Mesh(screenGeo, rearScreenMat);
  rearScreen.rotation.y = -Math.PI / 2;
  rearScreen.position.set(-0.015, opticalAxisY, 0);
  sensorGroup.add(rearScreen);

  const glassPlateRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, screenH + 0.06, screenW + 0.06),
    new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transmission: 0.85,
      roughness: 0.2,
      ior: 1.5,
    })
  );
  glassPlateRim.position.set(0, opticalAxisY, 0);
  sensorGroup.add(glassPlateRim);

  const sensorFrameCollider = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, screenH + 0.3, screenW + 0.3),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  sensorFrameCollider.position.set(sensorX, opticalAxisY, 0);
  rootGroup.add(sensorFrameCollider);

  // ============================================================================
  // 4. MULTI-ELEMENT PHOTOGRAPHIC LENS ASSEMBLY (GOLDEN-BROWN RINGS, EMBOSSED BLACK MOUNTS, BULGED GLASS)
  // ============================================================================
  const lensGroup = new THREE.Group();
  rootGroup.add(lensGroup);

  const opticalGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0fdfa,
    metalness: 0.0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 0.95,
    ior: 1.62,
    reflectivity: 0.95,
    envMapIntensity: 2.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(0xa7f3d0),
    attenuationDistance: 2.8,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const embossedOuterBlackMat = new THREE.MeshStandardMaterial({
    color: 0x14171d,
    roughness: 0.34,
    metalness: 0.48,
  });
  const embossedRidgeBlackMat = new THREE.MeshStandardMaterial({
    color: 0x242934,
    roughness: 0.22,
    metalness: 0.65,
  });
  const embossedInnerRecessMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e13,
    roughness: 0.5,
    metalness: 0.3,
  });

  const createBrassGearRing = (
    radius: number,
    width: number,
    teethCount: number
  ): THREE.Group => {
    const g = new THREE.Group();

    const ringTube = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 64, 1, true),
      goldenBrownBrassMat
    );
    ringTube.rotation.z = Math.PI / 2;
    ringTube.castShadow = true;
    ringTube.receiveShadow = true;
    g.add(ringTube);

    const innerRim = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.14, radius, 64),
      darkGoldenBrownMat
    );
    innerRim.rotation.y = Math.PI / 2;
    innerRim.position.x = width / 2;
    innerRim.castShadow = true;
    g.add(innerRim);

    const innerRimBack = innerRim.clone();
    innerRimBack.rotation.y = -Math.PI / 2;
    innerRimBack.position.x = -width / 2;
    innerRimBack.castShadow = true;
    g.add(innerRimBack);

    const toothGeo = new THREE.BoxGeometry(width * 0.92, 0.055, 0.045);
    const teethInst = new THREE.InstancedMesh(
      toothGeo,
      goldenBrownBrassMat,
      teethCount
    );
    teethInst.castShadow = true;
    teethInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < teethCount; i++) {
      const a = (i / teethCount) * Math.PI * 2;
      dummy.position.set(
        0,
        Math.cos(a) * (radius + 0.024),
        Math.sin(a) * (radius + 0.024)
      );
      dummy.rotation.set(a, 0, 0);
      dummy.updateMatrix();
      teethInst.setMatrixAt(i, dummy.matrix);
    }
    teethInst.instanceMatrix.needsUpdate = true;
    teethInst.computeBoundingSphere();
    g.add(teethInst);

    return g;
  };

  const rearBrassMountX = -1.18;
  const frontBrassMountX = -0.52;

  for (const mountX of [rearBrassMountX, frontBrassMountX]) {
    const mountGear = createBrassGearRing(1.22, 0.16, 72);
    mountGear.position.set(mountX, opticalAxisY, 0);
    lensGroup.add(mountGear);

    const stanchion = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.45, 0.45),
      darkGoldenBrownMat
    );
    stanchion.position.set(mountX, 0.34, 0);
    stanchion.castShadow = true;
    stanchion.receiveShadow = true;
    lensGroup.add(stanchion);
  }

  const carriageTieBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.12, 0.72),
    darkGoldenBrownMat
  );
  carriageTieBar.position.set(-1.15, 0.22, 0);
  carriageTieBar.castShadow = true;
  carriageTieBar.receiveShadow = true;
  lensGroup.add(carriageTieBar);

  const focusRingGroup = new THREE.Group();
  const focusRingX = 0.28;
  focusRingGroup.position.set(focusRingX, opticalAxisY, 0);
  lensGroup.add(focusRingGroup);

  const focusBarrelCore = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.16, 1.05, 64),
    embossedOuterBlackMat
  );
  focusBarrelCore.rotation.z = Math.PI / 2;
  focusBarrelCore.castShadow = true;
  focusBarrelCore.receiveShadow = true;
  focusRingGroup.add(focusBarrelCore);

  const ribCount = 60;
  const ribGeo = new THREE.BoxGeometry(0.68, 0.026, 0.028);
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x323846,
    roughness: 0.32,
    metalness: 0.65,
  });
  const ribsInst = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
  ribsInst.castShadow = true;
  ribsInst.receiveShadow = true;
  const ribDummy = new THREE.Object3D();
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * Math.PI * 2;
    ribDummy.position.set(0.06, Math.cos(a) * 1.17, Math.sin(a) * 1.17);
    ribDummy.rotation.set(a, 0, 0);
    ribDummy.updateMatrix();
    ribsInst.setMatrixAt(i, ribDummy.matrix);
  }
  ribsInst.instanceMatrix.needsUpdate = true;
  ribsInst.computeBoundingSphere();
  focusRingGroup.add(ribsInst);

  const focusAttachedGear = createBrassGearRing(1.24, 0.14, 72);
  focusAttachedGear.position.x = -0.45;
  focusRingGroup.add(focusAttachedGear);

  const frontHood = new THREE.Mesh(
    new THREE.CylinderGeometry(1.06, 1.16, 0.32, 64, 1, true),
    embossedOuterBlackMat
  );
  frontHood.rotation.z = Math.PI / 2;
  frontHood.position.set(0.92, opticalAxisY, 0);
  frontHood.castShadow = true;
  frontHood.receiveShadow = true;
  lensGroup.add(frontHood);

  const focusRingCollider = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.32, 1.6, 24),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  focusRingCollider.rotation.z = Math.PI / 2;
  focusRingCollider.position.set(0.05, opticalAxisY, 0);
  rootGroup.add(focusRingCollider);

  const elementSpecs: Array<{
    explodedX: number;
    assembledX: number;
    radius: number;
    thickness: number;
    frontCurve: number;
    rearCurve: number;
    isAperture?: boolean;
  }> = [
    {
      explodedX: 0.85,
      assembledX: 0.72,
      radius: 0.94,
      thickness: 0.11,
      frontCurve: 0.24,
      rearCurve: -0.05,
    },
    {
      explodedX: 0.15,
      assembledX: 0.32,
      radius: 0.88,
      thickness: 0.1,
      frontCurve: 0.18,
      rearCurve: -0.18,
    },
    {
      explodedX: -0.62,
      assembledX: -0.08,
      radius: 0.8,
      thickness: 0.1,
      frontCurve: -0.14,
      rearCurve: -0.14,
    },
    {
      explodedX: -1.18,
      assembledX: -0.45,
      radius: 0.82,
      thickness: 0.07,
      frontCurve: 0,
      rearCurve: 0,
      isAperture: true,
    },
    {
      explodedX: -1.72,
      assembledX: -0.82,
      radius: 0.84,
      thickness: 0.13,
      frontCurve: 0.22,
      rearCurve: 0.2,
    },
    {
      explodedX: -2.22,
      assembledX: -1.16,
      radius: 0.86,
      thickness: 0.11,
      frontCurve: 0.24,
      rearCurve: -0.06,
    },
    {
      explodedX: -2.68,
      assembledX: -1.48,
      radius: 0.8,
      thickness: 0.1,
      frontCurve: 0.14,
      rearCurve: 0.21,
    },
  ];

  const elementGroups: THREE.Group[] = [];
  const apertureBlades: THREE.Mesh[] = [];
  const currentElementX: number[] = elementSpecs.map((s) => s.explodedX);

  elementSpecs.forEach((spec, idx) => {
    const elGroup = new THREE.Group();
    elGroup.position.set(spec.explodedX, opticalAxisY, 0);
    lensGroup.add(elGroup);
    elementGroups.push(elGroup);

    const outerStepRadius = spec.radius + 0.085;
    const housingWidth = spec.thickness + 0.065;

    const ringHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(
        outerStepRadius,
        outerStepRadius,
        housingWidth,
        56,
        1,
        true
      ),
      embossedOuterBlackMat
    );
    ringHousing.rotation.z = Math.PI / 2;
    ringHousing.castShadow = true;
    ringHousing.receiveShadow = true;
    elGroup.add(ringHousing);

    const embossedRidge = new THREE.Mesh(
      new THREE.TorusGeometry(outerStepRadius + 0.012, 0.022, 16, 56),
      embossedRidgeBlackMat
    );
    embossedRidge.rotation.y = Math.PI / 2;
    embossedRidge.castShadow = true;
    elGroup.add(embossedRidge);

    const frontBezel = new THREE.Mesh(
      new THREE.RingGeometry(spec.radius - 0.02, outerStepRadius + 0.01, 56),
      embossedInnerRecessMat
    );
    frontBezel.rotation.y = Math.PI / 2;
    frontBezel.position.x = housingWidth / 2;
    frontBezel.castShadow = true;
    frontBezel.receiveShadow = true;
    elGroup.add(frontBezel);

    const backBezel = frontBezel.clone();
    backBezel.rotation.y = -Math.PI / 2;
    backBezel.position.x = -housingWidth / 2;
    backBezel.castShadow = true;
    backBezel.receiveShadow = true;
    elGroup.add(backBezel);

    if (spec.isAperture) {
      const bladeCount = 9;
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.lineTo(0.55, 0.14);
      bladeShape.lineTo(0.46, 0.42);
      bladeShape.lineTo(0.05, 0.26);
      bladeShape.closePath();

      const bladeGeo = new THREE.ShapeGeometry(bladeShape);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x181c26,
        roughness: 0.32,
        metalness: 0.72,
        side: THREE.DoubleSide,
      });

      for (let b = 0; b < bladeCount; b++) {
        const pivotGroup = new THREE.Group();
        const angle = (b / bladeCount) * Math.PI * 2;
        pivotGroup.rotation.x = angle;
        pivotGroup.position.x = (b - 4) * 0.002;

        const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
        bladeMesh.rotation.y = Math.PI / 2;
        bladeMesh.position.set(0, spec.radius * 0.88, 0);
        bladeMesh.castShadow = true;
        pivotGroup.add(bladeMesh);
        elGroup.add(pivotGroup);
        apertureBlades.push(bladeMesh);
      }
    } else {
      const lensGeo = createOpticalLensGeometry(
        spec.radius,
        spec.thickness,
        spec.frontCurve,
        spec.rearCurve
      );
      const lensMesh = new THREE.Mesh(lensGeo, opticalGlassMat);
      lensMesh.renderOrder = 4 + idx;
      elGroup.add(lensMesh);
    }
  });

  const outerAssembledShroud = new THREE.Group();
  outerAssembledShroud.position.set(-1.35, opticalAxisY, 0);
  const shroudCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 1.55, 64, 1, true),
    embossedOuterBlackMat
  );
  shroudCylinder.rotation.z = Math.PI / 2;
  shroudCylinder.castShadow = true;
  shroudCylinder.receiveShadow = true;
  outerAssembledShroud.add(shroudCylinder);

  const shroudGoldBand = new THREE.Mesh(
    new THREE.CylinderGeometry(1.125, 1.125, 0.06, 64, 1, true),
    goldenBrownBrassMat
  );
  shroudGoldBand.rotation.z = Math.PI / 2;
  shroudGoldBand.position.x = -0.68;
  outerAssembledShroud.add(shroudGoldBand);
  lensGroup.add(outerAssembledShroud);

  // ============================================================================
  // 5. NATURAL ALPINE VALLEY DIORAMA TARGET SCENE (DEEP WOODLAND GREENS & GRANITE PEAKS)
  // ============================================================================
  const dioramaGroup = new THREE.Group();
  rootGroup.add(dioramaGroup);

  const woodPlatformMat = new THREE.MeshStandardMaterial({
    color: 0x6e472b,
    roughness: 0.58,
    metalness: 0.06,
  });
  const woodEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x4a2e1a,
    roughness: 0.65,
    metalness: 0.05,
  });

  const platformTop = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.14, 3.1),
    woodPlatformMat
  );
  platformTop.position.set(4.5, 0.56, 0);
  platformTop.receiveShadow = true;
  platformTop.castShadow = true;
  dioramaGroup.add(platformTop);

  const platformRim = new THREE.Mesh(
    new THREE.BoxGeometry(4.54, 0.06, 3.14),
    woodEdgeMat
  );
  platformRim.position.set(4.5, 0.5, 0);
  dioramaGroup.add(platformRim);

  const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.52, 16);
  const legOffsets = [
    { x: 2.55, z: -1.32 },
    { x: 2.55, z: 1.32 },
    { x: 6.45, z: -1.32 },
    { x: 6.45, z: 1.32 },
  ];
  for (const lo of legOffsets) {
    const leg = new THREE.Mesh(legGeo, woodEdgeMat);
    leg.position.set(lo.x, 0.25, lo.z);
    dioramaGroup.add(leg);
  }

  // Deep Natural Mossy Woodland Turf Base (replaces artificial light-green turf)
  const turfMat = new THREE.MeshStandardMaterial({
    color: 0x233b21,
    roughness: 0.9,
    metalness: 0.02,
  });
  const turfBase = new THREE.Mesh(
    new THREE.BoxGeometry(4.24, 0.08, 2.84),
    turfMat
  );
  turfBase.position.set(4.5, 0.65, 0);
  turfBase.receiveShadow = true;
  dioramaGroup.add(turfBase);

  // Sculpted Organic Woodland Hillocks in varied deep moss & olive-earth tones
  const hillMat1 = new THREE.MeshStandardMaterial({
    color: 0x2b4727,
    roughness: 0.88,
    metalness: 0.02,
  });
  const hillMat2 = new THREE.MeshStandardMaterial({
    color: 0x1e331c,
    roughness: 0.9,
    metalness: 0.02,
  });

  const hill1 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), hillMat1);
  hill1.scale.set(1.2, 0.16, 0.9);
  hill1.position.set(3.6, 0.66, -0.45);
  hill1.receiveShadow = true;
  dioramaGroup.add(hill1);

  const hill2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 24, 16),
    hillMat2
  );
  hill2.scale.set(1.1, 0.18, 0.95);
  hill2.position.set(5.1, 0.66, 0.35);
  hill2.receiveShadow = true;
  dioramaGroup.add(hill2);

  // Natural granite boulders scattered across the valley floor for organic texture
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x4b535e,
    roughness: 0.85,
    flatShading: true,
  });
  const boulderCoords = [
    { x: 3.05, y: 0.71, z: 0.18, s: 0.09 },
    { x: 3.18, y: 0.69, z: 0.28, s: 0.06 },
    { x: 4.82, y: 0.72, z: 0.48, s: 0.11 },
    { x: 5.25, y: 0.71, z: -0.65, s: 0.13 },
  ];
  for (const b of boulderCoords) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(b.s, 0),
      boulderMat
    );
    rock.scale.set(1.2, 0.7, 1.0);
    rock.position.set(b.x, b.y, b.z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    dioramaGroup.add(rock);
  }

  // Deep Evergreen Spruce/Pine Tree Builder (rich woodland needles, not neon green)
  const createPineTreeGroup = (
    scale: number,
    tierColors: [number, number, number, number] = [
      0x18361f,
      0x1d4025,
      0x234a2b,
      0x295432,
    ]
  ): THREE.Group => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.045 * scale,
        0.065 * scale,
        0.26 * scale,
        12
      ),
      new THREE.MeshStandardMaterial({ color: 0x3b2313, roughness: 0.88 })
    );
    trunk.position.y = 0.13 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const coneTiers = [
      { y: 0.34, r: 0.28, h: 0.38, color: tierColors[0] },
      { y: 0.56, r: 0.23, h: 0.35, color: tierColors[1] },
      { y: 0.76, r: 0.17, h: 0.3, color: tierColors[2] },
      { y: 0.93, r: 0.11, h: 0.24, color: tierColors[3] },
    ];
    for (const tier of coneTiers) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(tier.r * scale, tier.h * scale, 16),
        new THREE.MeshStandardMaterial({
          color: tier.color,
          roughness: 0.82,
          metalness: 0.02,
        })
      );
      cone.position.y = tier.y * scale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }
    return tree;
  };

  // --- LAYER 1: FOREGROUND DEEP EVERGREEN PINES (27 cm -> X = 2.85) ---
  const heroPine = createPineTreeGroup(1.18, [
    0x1a3b22,
    0x1f4528,
    0x254f2e,
    0x2c5934,
  ]);
  heroPine.position.set(2.85, 0.68, 0.52);
  dioramaGroup.add(heroPine);

  const sidePine1 = createPineTreeGroup(0.88, [
    0x16331d,
    0x1b3b22,
    0x204528,
    0x264f2e,
  ]);
  sidePine1.position.set(2.72, 0.68, 1.02);
  dioramaGroup.add(sidePine1);

  const sidePine2 = createPineTreeGroup(0.76, [
    0x1d4025,
    0x224a2b,
    0x285431,
    0x2e5e37,
  ]);
  sidePine2.position.set(3.15, 0.68, 0.92);
  dioramaGroup.add(sidePine2);

  // --- LAYER 2: MIDGROUND WEATHERED CEDAR CABIN & OLIVE-FOREST TREE (54 cm -> X = 4.35) ---
  const cabinGroup = new THREE.Group();
  cabinGroup.position.set(4.35, 0.68, -0.05);
  cabinGroup.rotation.y = -0.18;
  dioramaGroup.add(cabinGroup);

  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.06, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x4b535e, roughness: 0.9 })
  );
  foundation.position.y = 0.03;
  cabinGroup.add(foundation);

  const cabinBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.42, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x8a5834, roughness: 0.76 })
  );
  cabinBody.position.y = 0.27;
  cabinBody.castShadow = true;
  cabinBody.receiveShadow = true;
  cabinGroup.add(cabinBody);

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.36, 0);
  roofShape.lineTo(0, 0.34);
  roofShape.lineTo(0.36, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 0.74,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  roofGeo.center();
  roofGeo.rotateY(Math.PI / 2);

  const roofMesh = new THREE.Mesh(
    roofGeo,
    new THREE.MeshStandardMaterial({ color: 0x2b190e, roughness: 0.7 })
  );
  roofMesh.position.set(0, 0.62, 0);
  roofMesh.castShadow = true;
  cabinGroup.add(roofMesh);

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.24, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x5c2822, roughness: 0.85 })
  );
  chimney.position.set(0.1, 0.72, -0.16);
  cabinGroup.add(chimney);

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const frontWin1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.14),
    windowGlowMat
  );
  frontWin1.rotation.y = -Math.PI / 2;
  frontWin1.position.set(-0.265, 0.29, -0.13);
  cabinGroup.add(frontWin1);

  const frontWin2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.14),
    windowGlowMat
  );
  frontWin2.rotation.y = -Math.PI / 2;
  frontWin2.position.set(-0.265, 0.29, 0.13);
  cabinGroup.add(frontWin2);

  const sideWin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.14),
    windowGlowMat
  );
  sideWin.position.set(0, 0.29, 0.315);
  cabinGroup.add(sideWin);

  // Warm tungsten hearth light spilling from the cabin windows onto the mossy turf
  const cabinWarmLight = new THREE.PointLight(0xffb347, 0.95, 2.2);
  cabinWarmLight.position.set(-0.35, 0.32, 0.05);
  cabinGroup.add(cabinWarmLight);

  // Natural Olive-Forest Deciduous Tree next to the Cabin
  const roundTreeGroup = new THREE.Group();
  roundTreeGroup.position.set(4.42, 0.68, -0.78);
  const roundTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.88 })
  );
  roundTrunk.position.y = 0.19;
  roundTreeGroup.add(roundTrunk);

  const foliageMainMat = new THREE.MeshStandardMaterial({
    color: 0x35592b,
    roughness: 0.78,
    metalness: 0.02,
  });
  const foliageLightMat = new THREE.MeshStandardMaterial({
    color: 0x3f6933,
    roughness: 0.76,
    metalness: 0.02,
  });
  const foliageDeepMat = new THREE.MeshStandardMaterial({
    color: 0x284520,
    roughness: 0.82,
    metalness: 0.02,
  });

  const mainCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24),
    foliageMainMat
  );
  mainCrown.position.set(0, 0.54, 0);
  mainCrown.castShadow = true;
  roundTreeGroup.add(mainCrown);

  const subCrown1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 20),
    foliageLightMat
  );
  subCrown1.position.set(-0.14, 0.46, 0.14);
  subCrown1.castShadow = true;
  roundTreeGroup.add(subCrown1);

  const subCrown2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 20, 20),
    foliageDeepMat
  );
  subCrown2.position.set(0.12, 0.48, -0.15);
  subCrown2.castShadow = true;
  roundTreeGroup.add(subCrown2);
  dioramaGroup.add(roundTreeGroup);

  // --- LAYER 3: BACKGROUND ALPINE GRANITE MOUNTAIN PEAKS (90 cm -> X = 6.05) ---
  const mainGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x4b5566,
    roughness: 0.84,
    metalness: 0.08,
    flatShading: true,
  });
  const darkGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    roughness: 0.86,
    metalness: 0.08,
    flatShading: true,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.52,
    metalness: 0.04,
    flatShading: true,
  });

  // Main Tall Alpine Granite Peak
  const mainPeakGroup = new THREE.Group();
  mainPeakGroup.position.set(6.05, 0.68, -0.42);
  const mainPeakBase = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 1.84, 7),
    mainGraniteMat
  );
  mainPeakBase.position.y = 0.92;
  mainPeakBase.rotation.y = 0.25;
  mainPeakBase.castShadow = true;
  mainPeakBase.receiveShadow = true;
  mainPeakGroup.add(mainPeakBase);

  const mainSnowCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.44, 0.86, 7),
    snowCapMat
  );
  mainSnowCap.position.y = 1.41;
  mainSnowCap.rotation.y = 0.25;
  mainSnowCap.scale.set(1.03, 1.0, 1.03);
  mainPeakGroup.add(mainSnowCap);
  dioramaGroup.add(mainPeakGroup);

  // Secondary Granite Peak
  const secPeakGroup = new THREE.Group();
  secPeakGroup.position.set(5.88, 0.68, 0.52);
  const secPeakBase = new THREE.Mesh(
    new THREE.ConeGeometry(0.74, 1.4, 6),
    darkGraniteMat
  );
  secPeakBase.position.y = 0.7;
  secPeakBase.rotation.y = 0.65;
  secPeakBase.castShadow = true;
  secPeakBase.receiveShadow = true;
  secPeakGroup.add(secPeakBase);

  const secSnowCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.66, 6),
    snowCapMat
  );
  secSnowCap.position.y = 1.07;
  secSnowCap.rotation.y = 0.65;
  secSnowCap.scale.set(1.03, 1.0, 1.03);
  secPeakGroup.add(secSnowCap);
  dioramaGroup.add(secPeakGroup);

  // Third rocky crag ridge between peaks for natural mountain silhouette
  const cragPeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 1.08, 5),
    darkGraniteMat
  );
  cragPeak.position.set(5.78, 1.22, -1.02);
  cragPeak.rotation.y = 0.4;
  cragPeak.castShadow = true;
  dioramaGroup.add(cragPeak);

  const bgPine1 = createPineTreeGroup(0.62, [
    0x142e19,
    0x19361e,
    0x1e3f24,
    0x234729,
  ]);
  bgPine1.position.set(5.65, 0.68, -1.08);
  dioramaGroup.add(bgPine1);

  const bgPine2 = createPineTreeGroup(0.54, [
    0x16331d,
    0x1b3b22,
    0x204427,
    0x254c2c,
  ]);
  bgPine2.position.set(5.45, 0.68, 1.05);
  dioramaGroup.add(bgPine2);

  // ============================================================================
  // 6. THE PLANE OF FOCUS & SHARP ZONE VOLUMETRIC INDICATORS
  // ============================================================================
  const planeOfFocusGroup = new THREE.Group();
  const initialFocusX = distanceCmToWorldX(54);
  planeOfFocusGroup.position.set(initialFocusX, 1.56, 0);
  rootGroup.add(planeOfFocusGroup);

  const pofWidth = 2.86;
  const pofHeight = 1.82;

  const pofGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(pofWidth, pofHeight),
    new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pofGlass.rotation.y = Math.PI / 2;
  pofGlass.renderOrder = 20;
  planeOfFocusGroup.add(pofGlass);

  const pofEdges = new THREE.EdgesGeometry(
    new THREE.PlaneGeometry(pofWidth, pofHeight)
  );
  const pofBorder = new THREE.LineSegments(
    pofEdges,
    new THREE.LineBasicMaterial({
      color: 0xa7f3d0,
      transparent: true,
      opacity: 0.85,
    })
  );
  pofBorder.rotation.y = Math.PI / 2;
  pofBorder.renderOrder = 21;
  planeOfFocusGroup.add(pofBorder);

  const crossPts = [
    new THREE.Vector3(0, -pofHeight / 2, 0),
    new THREE.Vector3(0, pofHeight / 2, 0),
    new THREE.Vector3(0, 0, -pofWidth / 2),
    new THREE.Vector3(0, 0, pofWidth / 2),
  ];
  const crossLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(crossPts),
    new THREE.LineBasicMaterial({
      color: 0xa7f3d0,
      transparent: true,
      opacity: 0.28,
    })
  );
  planeOfFocusGroup.add(crossLines);

  const sharpZoneGroup = new THREE.Group();
  sharpZoneGroup.position.set(initialFocusX, 1.56, 0);
  rootGroup.add(sharpZoneGroup);

  const sharpZoneBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, pofHeight * 0.96, pofWidth * 0.98),
    new THREE.MeshBasicMaterial({
      color: 0x99f6e4,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  sharpZoneBox.renderOrder = 18;
  sharpZoneGroup.add(sharpZoneBox);

  const caliperBracketGroup = new THREE.Group();
  caliperBracketGroup.position.set(initialFocusX, 0.56, 1.62);
  rootGroup.add(caliperBracketGroup);

  const caliperBar = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.04, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  caliperBracketGroup.add(caliperBar);

  const leftTick = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.14, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  caliperBracketGroup.add(leftTick);

  const rightTick = leftTick.clone();
  caliperBracketGroup.add(rightTick);

  // ============================================================================
  // 7. ANIMATION & KINEMATICS STATE (DAMPED INTERPOLATION)
  // ============================================================================
  let dampedFocusCm = 54;
  let dampedApertureNorm = 1.0;
  let dampedExplodedFactor = 1.0;

  const anchors = {
    imagePlane: new THREE.Vector3(sensorX, opticalAxisY + 0.95, 0),
    focusRing: new THREE.Vector3(focusRingX, opticalAxisY + 1.32, 0),
    planeOfFocus: new THREE.Vector3(initialFocusX, opticalAxisY + 1.25, 0),
    sharpZone: new THREE.Vector3(initialFocusX, 0.42, 1.62),
  };

  const updateFrame = (
    dt: number,
    targetFocusCm: number,
    targetAperture: ApertureStop,
    targetExploded: boolean
  ) => {
    const safeDt = Math.min(dt, 0.1);

    dampedFocusCm = THREE.MathUtils.damp(
      dampedFocusCm,
      targetFocusCm,
      12,
      safeDt
    );

    const targetApNorm =
      targetAperture === 2 ? 1.0 : targetAperture === 5.6 ? 0.48 : 0.16;
    dampedApertureNorm = THREE.MathUtils.damp(
      dampedApertureNorm,
      targetApNorm,
      12,
      safeDt
    );

    const targetExp = targetExploded ? 1.0 : 0.0;
    dampedExplodedFactor = THREE.MathUtils.damp(
      dampedExplodedFactor,
      targetExp,
      9,
      safeDt
    );

    const focusNorm = (dampedFocusCm - 20) / 80;
    focusRingGroup.rotation.x = focusNorm * Math.PI * 1.65;
    const helicoidShift = (focusNorm - 0.425) * 0.18;
    focusRingGroup.position.x = focusRingX + helicoidShift;

    scrubHandle.position.x = -0.25 + (focusNorm - 0.5) * 5.2;

    rightApertureStops.forEach((stop, i) => {
      const mat = rightApertureRings[i].material as THREE.MeshBasicMaterial;
      mat.opacity = stop === targetAperture ? 0.95 : 0.0;
    });

    leftApertureFace.rotation.z = (1 - dampedApertureNorm) * 0.55;

    for (let i = 0; i < elementSpecs.length; i++) {
      const spec = elementSpecs[i];
      const baseX = THREE.MathUtils.lerp(
        spec.assembledX,
        spec.explodedX,
        dampedExplodedFactor
      );
      const focusShift = i <= 2 ? helicoidShift * 0.65 : 0;
      const finalX = baseX + focusShift;
      currentElementX[i] = finalX;
      elementGroups[i].position.x = finalX;
    }

    const irisOpenRadius = 0.12 + dampedApertureNorm * 0.58;
    for (const blade of apertureBlades) {
      blade.position.y = irisOpenRadius;
      blade.rotation.z = (1 - dampedApertureNorm) * 0.45;
    }

    const shroudScaleX = THREE.MathUtils.lerp(1.0, 0.01, dampedExplodedFactor);
    outerAssembledShroud.scale.set(shroudScaleX, 1, 1);
    outerAssembledShroud.visible = dampedExplodedFactor < 0.96;

    const pofWorldX = distanceCmToWorldX(dampedFocusCm);
    planeOfFocusGroup.position.x = pofWorldX;

    let sharpZoneCm = 1.9;
    if (targetAperture === 2) {
      sharpZoneCm =
        0.00056 * dampedFocusCm * dampedFocusCm + 0.004 * dampedFocusCm + 0.18;
    } else if (targetAperture === 5.6) {
      sharpZoneCm =
        0.00125 * dampedFocusCm * dampedFocusCm + 0.012 * dampedFocusCm + 0.65;
    } else {
      sharpZoneCm =
        0.00105 * dampedFocusCm * dampedFocusCm + 0.038 * dampedFocusCm + 3.6;
    }
    const worldSpanX = Math.max(0.06, (sharpZoneCm / 80) * 4.05);

    sharpZoneGroup.position.x = pofWorldX;
    sharpZoneBox.scale.x = worldSpanX;

    caliperBracketGroup.position.x = pofWorldX;
    caliperBar.scale.x = worldSpanX;
    leftTick.position.x = -worldSpanX / 2;
    rightTick.position.x = worldSpanX / 2;

    anchors.focusRing.set(focusRingGroup.position.x, opticalAxisY + 1.32, 0);
    anchors.planeOfFocus.set(pofWorldX, opticalAxisY + 1.25, 0);
    anchors.sharpZone.set(pofWorldX, 0.36, 1.62);

    return {
      currentFocusCm: dampedFocusCm,
      currentApertureRadiusNorm: dampedApertureNorm,
      lensElementWorldX: currentElementX,
    };
  };

  return {
    rootGroup,
    opticalAxisY,
    sensorX,
    focusRingCollider,
    sensorFrameCollider,
    consoleSliderCollider,
    anchors,
    updateFrame,
  };
}
