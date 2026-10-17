import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  ApertureStop,
  CameraViewPreset,
  computeOpticalReadout,
  LensViewMode,
  MAX_FOCUS_CM,
  MIN_FOCUS_CM,
} from '../optics/opticsMath';
import {
  ConsoleFilmstripRenderer,
  SensorGroundGlassRenderer,
} from '../optics/proceduralTextures';
import { buildOpticalBenchScene } from '../optics/buildSceneObjects';
import { OpticalRayTracer3D } from '../optics/rayTracer3D';
import { soundEngine } from '../optics/soundEffects';

interface OpticalBenchCanvasProps {
  focusDistanceCm: number;
  aperture: ApertureStop;
  lensView: LensViewMode;
  cameraPreset: CameraViewPreset;
  onFocusChange: (newDistanceCm: number) => void;
  onCameraPresetChange: (preset: CameraViewPreset) => void;
}

const CAMERA_PRESETS: Record<
  CameraViewPreset,
  { pos: THREE.Vector3; target: THREE.Vector3 }
> = {
  bench: {
    pos: new THREE.Vector3(0.05, 1.52, 8.95),
    target: new THREE.Vector3(0.15, 0.55, 0),
  },
  sensor: {
    pos: new THREE.Vector3(-8.45, 1.48, 0.35),
    target: new THREE.Vector3(-3.2, 1.28, -0.25),
  },
  diorama: {
    pos: new THREE.Vector3(4.45, 2.35, 5.15),
    target: new THREE.Vector3(4.45, 1.05, 0),
  },
};

export const OpticalBenchCanvas: React.FC<OpticalBenchCanvasProps> = ({
  focusDistanceCm,
  aperture,
  lensView,
  cameraPreset,
  onFocusChange,
  onCameraPresetChange,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const imagePlaneBadgeRef = useRef<HTMLButtonElement | null>(null);
  const focusRingBadgeRef = useRef<HTMLDivElement | null>(null);
  const planeOfFocusBadgeRef = useRef<HTMLDivElement | null>(null);
  const sharpZoneBadgeRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    focusDistanceCm,
    aperture,
    lensView,
    cameraPreset,
    onFocusChange,
    onCameraPresetChange,
  });

  useEffect(() => {
    stateRef.current = {
      focusDistanceCm,
      aperture,
      lensView,
      cameraPreset,
      onFocusChange,
      onCameraPresetChange,
    };
  }, [
    focusDistanceCm,
    aperture,
    lensView,
    cameraPreset,
    onFocusChange,
    onCameraPresetChange,
  ]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Dark, intimate gallery room atmosphere (no bright outdoor daylight)
    scene.background = new THREE.Color(0x0b0f17);
    scene.fog = new THREE.FogExp2(0x0b0f17, 0.021);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.03
    ).texture;
    scene.environmentIntensity = 0.42;
    pmremGenerator.dispose();

    RectAreaLightUniformsLib.init();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.bench.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.copy(CAMERA_PRESETS.bench.target);
    controls.minDistance = 2.4;
    controls.maxDistance = 18.0;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.minPolarAngle = 0.05;

    // Subtle dark-room indoor ambient fill with warm interior gallery bounce (replaces cold blue slate)
    const indoorAmbient = new THREE.HemisphereLight(0x382c20, 0x1c150e, 0.45);
    scene.add(indoorAmbient);

    // 1. Primary Gallery Track Spotlight over the Multi-Element Lens & Optical Bench (warm golden tungsten beam)
    const benchTrackSpot = new THREE.SpotLight(
      0xffd699,
      42,
      24,
      Math.PI / 3.3,
      0.58,
      1.35
    );
    benchTrackSpot.position.set(-0.6, 6.45, 1.85);
    benchTrackSpot.target.position.set(-0.5, 0.6, -0.15);
    benchTrackSpot.castShadow = !isHeadless;
    benchTrackSpot.shadow.mapSize.width = 2048;
    benchTrackSpot.shadow.mapSize.height = 2048;
    benchTrackSpot.shadow.camera.near = 2.0;
    benchTrackSpot.shadow.camera.far = 16;
    benchTrackSpot.shadow.bias = -0.00025;
    benchTrackSpot.shadow.normalBias = 0.015;
    scene.add(benchTrackSpot);
    scene.add(benchTrackSpot.target);

    // 2. Dedicated Gallery Track Spotlight over the Natural Alpine Valley Diorama (warm rich sunbeam)
    const dioramaTrackSpot = new THREE.SpotLight(
      0xffcc85,
      45,
      20,
      Math.PI / 3.8,
      0.55,
      1.35
    );
    dioramaTrackSpot.position.set(4.6, 6.45, 1.85);
    dioramaTrackSpot.target.position.set(4.5, 0.75, -0.15);
    dioramaTrackSpot.castShadow = !isHeadless;
    dioramaTrackSpot.shadow.mapSize.width = 1024;
    dioramaTrackSpot.shadow.mapSize.height = 1024;
    dioramaTrackSpot.shadow.camera.near = 2.0;
    dioramaTrackSpot.shadow.camera.far = 16;
    dioramaTrackSpot.shadow.bias = -0.00025;
    dioramaTrackSpot.shadow.normalBias = 0.015;
    scene.add(dioramaTrackSpot);
    scene.add(dioramaTrackSpot.target);

    // 3. Warm Champagne Ridge Accent Light on the Granite Mountain Peaks (replaces cold icy blue)
    const mountainRimSpot = new THREE.SpotLight(
      0xffdfa3,
      18,
      14,
      Math.PI / 4.2,
      0.68,
      1.4
    );
    mountainRimSpot.position.set(7.2, 4.8, -2.2);
    mountainRimSpot.target.position.set(5.9, 1.5, -0.3);
    scene.add(mountainRimSpot);
    scene.add(mountainRimSpot.target);

    // 4. Left Track Spotlight illuminating the Ground Glass Sensor & Left Aperture Console (warm halogen)
    const sensorTrackSpot = new THREE.SpotLight(
      0xffd99f,
      26,
      18,
      Math.PI / 3.8,
      0.62,
      1.35
    );
    sensorTrackSpot.position.set(-4.7, 6.45, 1.85);
    sensorTrackSpot.target.position.set(-4.8, 0.75, -0.15);
    sensorTrackSpot.castShadow = !isHeadless;
    sensorTrackSpot.shadow.mapSize.width = 1024;
    sensorTrackSpot.shadow.mapSize.height = 1024;
    sensorTrackSpot.shadow.camera.near = 2.0;
    sensorTrackSpot.shadow.camera.far = 16;
    sensorTrackSpot.shadow.bias = -0.00025;
    sensorTrackSpot.shadow.normalBias = 0.015;
    scene.add(sensorTrackSpot);
    scene.add(sensorTrackSpot.target);

    // 5. Overhead Gallery Luminaire Softboxes for warm specular reflections on the bulged lens glass & golden-brown bronze rings
    const topSoftbox = new THREE.RectAreaLight(0xffdfa8, 4.2, 6.5, 1.6);
    topSoftbox.position.set(-0.5, 4.9, 1.9);
    topSoftbox.lookAt(-0.5, 1.3, 0);
    scene.add(topSoftbox);

    // Front softbox warm peach-amber fill (replaces cool light-blue fill)
    const frontSoftbox = new THREE.RectAreaLight(0xffe1b8, 2.8, 5.2, 1.3);
    frontSoftbox.position.set(-0.8, 2.6, 3.9);
    frontSoftbox.lookAt(-0.8, 1.3, 0);
    scene.add(frontSoftbox);

    // Subtle warm floor bounce light creating rich studio optical-bench warmth
    const warmFloorBounce = new THREE.DirectionalLight(0xffbe6b, 0.42);
    warmFloorBounce.position.set(0, -2.2, 2.2);
    warmFloorBounce.target.position.set(0, 0.8, 0);
    scene.add(warmFloorBounce);
    scene.add(warmFloorBounce.target);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const sensorRenderer = new SensorGroundGlassRenderer(maxAniso);
    const filmstripRenderer = new ConsoleFilmstripRenderer(maxAniso);

    const benchRig = buildOpticalBenchScene(
      scene,
      maxAniso,
      sensorRenderer,
      filmstripRenderer
    );

    const rayTracer = new OpticalRayTracer3D(
      benchRig.opticalAxisY,
      benchRig.sensorX
    );
    scene.add(rayTracer.group);

    renderer.compile(scene, camera);

    let activePresetTransition: CameraViewPreset | null = null;
    let lastPresetProp: CameraViewPreset = stateRef.current.cameraPreset;

    const onUserControlStart = () => {
      activePresetTransition = null;
    };
    controls.addEventListener('start', onUserControlStart);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDraggingFocus = false;
    let dragStartX = 0;
    let dragStartFocusCm = 54;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects([
        benchRig.focusRingCollider,
        benchRig.consoleSliderCollider,
        benchRig.sensorFrameCollider,
      ]);

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (
          hitObj === benchRig.focusRingCollider ||
          hitObj === benchRig.consoleSliderCollider
        ) {
          isDraggingFocus = true;
          dragStartX = e.clientX;
          dragStartFocusCm = stateRef.current.focusDistanceCm;
          controls.enabled = false;
          renderer.domElement.style.cursor = 'ew-resize';
          renderer.domElement.setPointerCapture(e.pointerId);
        } else if (hitObj === benchRig.sensorFrameCollider) {
          const nextPreset: CameraViewPreset =
            stateRef.current.cameraPreset === 'sensor' ? 'bench' : 'sensor';
          stateRef.current.onCameraPresetChange(nextPreset);
          activePresetTransition = nextPreset;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingFocus) {
        const deltaPx = e.clientX - dragStartX;
        const deltaCm = Math.round(deltaPx * 0.22);
        const nextCm = Math.max(
          MIN_FOCUS_CM,
          Math.min(MAX_FOCUS_CM, dragStartFocusCm + deltaCm)
        );
        if (nextCm !== stateRef.current.focusDistanceCm) {
          soundEngine.playFocusTick();
          stateRef.current.onFocusChange(nextCm);
        }
        return;
      }

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([
        benchRig.focusRingCollider,
        benchRig.consoleSliderCollider,
        benchRig.sensorFrameCollider,
      ]);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        renderer.domElement.style.cursor =
          hitObj === benchRig.sensorFrameCollider ? 'pointer' : 'ew-resize';
      } else {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDraggingFocus) {
        isDraggingFocus = false;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'grab';
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);

    const projVec = new THREE.Vector3();
    const positionBadge = (
      el: HTMLElement | null,
      worldPos: THREE.Vector3
    ) => {
      if (!el) return;
      projVec.copy(worldPos).project(camera);
      if (projVec.z > 1) {
        el.style.opacity = '0';
        return;
      }
      const x = (projVec.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const y = (-(projVec.y * 0.5) + 0.5) * renderer.domElement.clientHeight;
      el.style.opacity = '1';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    };

    const clock = new THREE.Clock();
    let reqId = 0;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const st = stateRef.current;

      if (st.cameraPreset !== lastPresetProp) {
        lastPresetProp = st.cameraPreset;
        activePresetTransition = st.cameraPreset;
      }

      if (activePresetTransition) {
        const targetCam = CAMERA_PRESETS[activePresetTransition];
        const dampSpeed = 6.5;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          targetCam.pos.x,
          dampSpeed,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          targetCam.pos.y,
          dampSpeed,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          targetCam.pos.z,
          dampSpeed,
          dt
        );

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          targetCam.target.x,
          dampSpeed,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          targetCam.target.y,
          dampSpeed,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          targetCam.target.z,
          dampSpeed,
          dt
        );

        if (camera.position.distanceTo(targetCam.pos) < 0.03) {
          activePresetTransition = null;
        }
      }

      controls.update();

      const rigFrame = benchRig.updateFrame(
        dt,
        st.focusDistanceCm,
        st.aperture,
        st.lensView === 'exploded'
      );

      rayTracer.update(
        rigFrame.currentFocusCm,
        rigFrame.currentApertureRadiusNorm,
        rigFrame.lensElementWorldX,
        benchRig.opticalAxisY,
        benchRig.sensorX
      );

      const roundedFocus = Math.round(rigFrame.currentFocusCm);
      sensorRenderer.update(roundedFocus, st.aperture);
      filmstripRenderer.update(roundedFocus, st.aperture);

      positionBadge(imagePlaneBadgeRef.current, benchRig.anchors.imagePlane);
      positionBadge(focusRingBadgeRef.current, benchRig.anchors.focusRing);
      positionBadge(
        planeOfFocusBadgeRef.current,
        benchRig.anchors.planeOfFocus
      );
      positionBadge(sharpZoneBadgeRef.current, benchRig.anchors.sharpZone);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onUserControlStart);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  const readout = computeOpticalReadout(focusDistanceCm, aperture);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={canvasMountRef} className="w-full h-full" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        <button
          ref={imagePlaneBadgeRef}
          type="button"
          onClick={() =>
            onCameraPresetChange(cameraPreset === 'sensor' ? 'bench' : 'sensor')
          }
          title="Click to inspect the inverted ground glass image plane"
          className="pointer-events-auto absolute top-0 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14171f]/90 hover:bg-[#1e2330] border border-white/15 text-xs text-white shadow-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-semibold">Image plane</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70 font-mono-tabular text-[11px]">
            upside-down
          </span>
        </button>

        <div
          ref={focusRingBadgeRef}
          className="absolute top-0 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14171f]/90 border border-amber-400/30 text-xs text-white shadow-lg whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="font-semibold">Focus ring</span>
          <span className="text-white/40">·</span>
          <span className="text-amber-200/80 font-mono-tabular text-[11px]">
            drag ↔
          </span>
        </div>

        <div
          ref={planeOfFocusBadgeRef}
          className="absolute top-0 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14171f]/90 border border-emerald-400/30 text-xs text-white shadow-lg whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
          <span className="font-semibold">Plane of focus</span>
          <span className="text-white/40">·</span>
          <span className="text-emerald-200 font-mono-tabular text-[11px]">
            {readout.focusDistanceCm} cm
          </span>
        </div>

        <div
          ref={sharpZoneBadgeRef}
          className="absolute top-0 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14171f]/90 border border-white/15 text-xs text-white shadow-lg whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
          <span className="font-semibold">Sharp zone</span>
          <span className="text-white/40">·</span>
          <span className="text-white/80 font-mono-tabular text-[11px]">
            {readout.sharpZoneCm.toFixed(1)} cm
          </span>
        </div>
      </div>
    </div>
  );
};
