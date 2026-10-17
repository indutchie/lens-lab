/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  HelpCircle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ApertureStop,
  CameraViewPreset,
  computeOpticalReadout,
  FocusPreset,
  LensViewMode,
  MAX_FOCUS_CM,
  MIN_FOCUS_CM,
  SCENE_SUBJECTS,
} from './optics/opticsMath';
import { OpticalBenchCanvas } from './components/OpticalBenchCanvas';
import { soundEngine } from './optics/soundEffects';

export default function App() {
  const [focusDistanceCm, setFocusDistanceCm] = useState<number>(54);
  const [aperture, setAperture] = useState<ApertureStop>(2);
  const [lensView, setLensView] = useState<LensViewMode>('exploded');
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('bench');
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const readout = computeOpticalReadout(focusDistanceCm, aperture);

  const handleFocusPreset = useCallback((preset: FocusPreset) => {
    const targetCm = SCENE_SUBJECTS[preset].distanceCm;
    soundEngine.playFocusTick();
    soundEngine.playSyncedArpeggioNote();
    setFocusDistanceCm(targetCm);
  }, []);

  const handleFocusSliderChange = useCallback((newCm: number) => {
    const clamped = Math.max(
      MIN_FOCUS_CM,
      Math.min(MAX_FOCUS_CM, Math.round(newCm))
    );
    soundEngine.playFocusTick();
    setFocusDistanceCm(clamped);
  }, []);

  const handleApertureChange = useCallback((newStop: ApertureStop) => {
    soundEngine.playApertureClick(newStop);
    setAperture(newStop);
  }, []);

  const handleLensViewToggle = useCallback((mode: LensViewMode) => {
    soundEngine.playLensSlide(mode === 'exploded');
    setLensView(mode);
  }, []);

  const toggleMute = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev;
      soundEngine.muted = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === '1') {
        handleFocusPreset('foreground');
      } else if (key === '2') {
        handleFocusPreset('middle');
      } else if (key === '3') {
        handleFocusPreset('background');
      } else if (key === 'q') {
        handleApertureChange(2);
      } else if (key === 'w') {
        handleApertureChange(5.6);
      } else if (key === 'e') {
        handleApertureChange(16);
      } else if (e.code === 'Space' || e.key === 'Tab') {
        e.preventDefault();
        setLensView((prev) => {
          const next = prev === 'exploded' ? 'assembled' : 'exploded';
          soundEngine.playLensSlide(next === 'exploded');
          return next;
        });
      } else if (key === 'v') {
        setCameraPreset((prev) => (prev === 'bench' ? 'sensor' : 'bench'));
      } else if (key === 'h') {
        setHudCollapsed((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        handleFocusSliderChange(focusDistanceCm - 2);
      } else if (e.key === 'ArrowRight') {
        handleFocusSliderChange(focusDistanceCm + 2);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    focusDistanceCm,
    handleApertureChange,
    handleFocusPreset,
    handleFocusSliderChange,
  ]);

  return (
    <div className="relative w-screen h-screen bg-[#0d0f14] text-white overflow-hidden select-none">
      {/* Full-Viewport 3D Optical Bench Canvas */}
      <OpticalBenchCanvas
        focusDistanceCm={focusDistanceCm}
        aperture={aperture}
        lensView={lensView}
        cameraPreset={cameraPreset}
        onFocusChange={setFocusDistanceCm}
        onCameraPresetChange={setCameraPreset}
      />

      {/* TOP-LEFT EDITORIAL & TELEMETRY HUD */}
      <aside
        className={`pointer-events-auto fixed top-4 left-4 z-20 w-[330px] sm:w-[356px] rounded-xl bg-[#111319]/92 border border-white/10 px-5 py-4 shadow-2xl transition-all duration-200 ${
          hudCollapsed
            ? '-translate-y-[120%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-300/90 uppercase">
          The Plane
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-none mt-0.5 mb-2.5">
          OF FOCUS
        </h1>

        <p className="text-[12.5px] leading-[1.48] text-white/75 mb-3.5">
          Everyone knows out-of-focus is blurry. Almost nobody knows why. Focus
          isn&apos;t a zone — it&apos;s a razor-thin 2D plane. Turn the Focus
          Ring or scrub below.
        </p>

        {/* Live 3-Column Telemetry Strip */}
        <div className="grid grid-cols-3 border-y border-white/12 py-2.5 my-3">
          <div className="pr-2">
            <div className="text-[9.5px] font-medium tracking-[0.12em] text-white/45 uppercase">
              Focused At
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-white mt-0.5">
              {readout.focusDistanceCm}{' '}
              <span className="text-xs font-normal text-white/65">cm</span>
            </div>
          </div>

          <div className="px-3 border-x border-white/12">
            <div className="text-[9.5px] font-medium tracking-[0.12em] text-white/45 uppercase">
              Aperture
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-white mt-0.5">
              f/{readout.aperture}
            </div>
          </div>

          <div className="pl-3">
            <div className="text-[9.5px] font-medium tracking-[0.12em] text-white/45 uppercase">
              Sharp Zone
            </div>
            <div className="font-mono-tabular text-lg font-semibold text-white mt-0.5">
              {readout.sharpZoneCm.toFixed(1)}{' '}
              <span className="text-xs font-normal text-white/65">cm</span>
            </div>
          </div>
        </div>

        {/* Dynamic Sharp Zone Near/Far Limits Sub-Readout */}
        <div className="flex items-center justify-between text-[11px] text-white/55 font-mono-tabular mb-2.5">
          <span>Near limit: {readout.nearLimitCm.toFixed(1)} cm</span>
          <span>·</span>
          <span>Far limit: {readout.farLimitCm.toFixed(1)} cm</span>
        </div>

        {/* Dynamic Contextual Optical Explanation */}
        <p className="text-[12.5px] leading-[1.48] text-white/75">
          {readout.narrativeParts.prefix}
          <strong className="font-semibold text-white">
            {readout.narrativeParts.highlight1}
          </strong>
          {readout.narrativeParts.middle}
          <strong className="font-semibold text-white">
            {readout.narrativeParts.highlight2}
          </strong>
          {readout.narrativeParts.suffix}
          {readout.headlineSubject && (
            <>
              {' '}
              Sharp zone:{' '}
              <strong className="font-semibold text-white font-mono-tabular">
                {readout.narrativeParts.sharpZoneText}
              </strong>
              .
            </>
          )}
        </p>
      </aside>

      {/* TOP-RIGHT INTERACTIVE CONTROLS DOCK */}
      <section
        aria-label="Optical Bench Controls"
        className={`pointer-events-auto fixed top-4 right-4 z-20 w-[360px] sm:w-[440px] rounded-xl bg-[#111319]/92 border border-white/10 px-4 py-3.5 shadow-2xl transition-all duration-200 ${
          hudCollapsed
            ? '-translate-y-[120%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Row 1: Focus Presets + Continuous Distance Slider */}
        <div>
          <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-white/50 uppercase mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white/75">Focus</span>
              <span className="font-mono-tabular text-[9.5px] text-white/40 normal-case tracking-normal">
                drag the ring · 1 2 3
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50">Distance</span>
              <span className="font-mono-tabular text-white font-semibold text-xs normal-case">
                {readout.focusDistanceCm} cm
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-3">
            {/* Foreground / Middle / Background Segmented Control */}
            <div className="grid grid-cols-3 bg-white/[0.06] p-0.5 rounded-lg border border-white/10 shrink-0">
              {(['foreground', 'middle', 'background'] as FocusPreset[]).map(
                (preset) => {
                  const subj = SCENE_SUBJECTS[preset];
                  const isActive = readout.activePreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFocusPreset(preset)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-[#0d0f14] font-semibold shadow-sm'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      {subj.label}
                    </button>
                  );
                }
              )}
            </div>

            {/* Continuous Focus Distance Slider (20 cm .. 100 cm) */}
            <div className="flex-1 flex items-center">
              <input
                type="range"
                aria-label="Focus distance in centimeters"
                min={MIN_FOCUS_CM}
                max={MAX_FOCUS_CM}
                step={1}
                value={focusDistanceCm}
                onChange={(e) =>
                  handleFocusSliderChange(Number(e.target.value))
                }
                className="w-full optics-slider"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Aperture Control + Lens Assembled/Exploded Toggle + Sound Mute & Help */}
        <div className="grid grid-cols-12 gap-2.5 items-end pt-2 border-t border-white/10">
          {/* Aperture Stop Selector (f/2, f/5.6, f/16) */}
          <div className="col-span-5">
            <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-white/50 uppercase mb-1.5">
              <span className="font-semibold text-white/75">Aperture</span>
              <span className="font-mono-tabular text-[9.5px] text-white/40">
                Q W E
              </span>
            </div>
            <div className="grid grid-cols-3 bg-white/[0.06] p-0.5 rounded-lg border border-white/10">
              {([2, 5.6, 16] as ApertureStop[]).map((stop) => {
                const isActive = aperture === stop;
                return (
                  <button
                    key={stop}
                    type="button"
                    onClick={() => handleApertureChange(stop)}
                    className={`py-1.5 text-xs font-mono-tabular rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#0d0f14] font-semibold shadow-sm'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    f/{stop}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lens View Toggle (Assembled vs Exploded) */}
          <div className="col-span-5">
            <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-white/50 uppercase mb-1.5">
              <span className="font-semibold text-white/75">Lens</span>
              <span className="font-mono-tabular text-[9.5px] text-white/40 normal-case tracking-normal">
                Space · Tab
              </span>
            </div>
            <div className="grid grid-cols-2 bg-white/[0.06] p-0.5 rounded-lg border border-white/10">
              {(['assembled', 'exploded'] as LensViewMode[]).map((mode) => {
                const isActive = lensView === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleLensViewToggle(mode)}
                    className={`py-1.5 text-xs font-medium capitalize rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#0d0f14] font-semibold shadow-sm'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Utility Buttons (Audio Mute & Help Modal) */}
          <div className="col-span-2 flex items-center justify-end gap-1 pb-0.5">
            <button
              type="button"
              onClick={toggleMute}
              title={
                soundMuted
                  ? 'Unmute mechanical audio'
                  : 'Mute mechanical audio'
              }
              className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
            >
              {soundMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              title="Optical Bench Guide & Shortcuts"
              className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* BOTTOM CAMERA PRESET & ZEN MODE BAR */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#111319]/92 border border-white/12 rounded-xl px-3 py-1.5 shadow-xl">
        <Camera className="w-3.5 h-3.5 text-white/55 shrink-0" />
        <span className="text-[11px] text-white/55 hidden sm:inline whitespace-nowrap">
          Camera:
        </span>
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'bench', label: 'Optical Bench Overview' },
              { id: 'sensor', label: 'Image Plane (Upside-Down)' },
              { id: 'diorama', label: 'Valley Diorama' },
            ] as Array<{ id: CameraViewPreset; label: string }>
          ).map((cam) => {
            const active = cameraPreset === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setCameraPreset(cam.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#0d0f14] font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {cam.label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-white/15 mx-1" />

        <button
          type="button"
          onClick={() => setHudCollapsed((prev) => !prev)}
          title="Toggle HUD visibility (Shortcut: H)"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer whitespace-nowrap"
        >
          {hudCollapsed ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show HUD</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Hide HUD</span>
            </>
          )}
        </button>
      </div>

      {/* OPTICAL GUIDE & KEYBOARD SHORTCUTS MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-[#14171f] border border-white/15 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white">
                How the Optical Bench Works
              </h2>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs leading-relaxed text-white/80">
              <p>
                <strong className="text-white">1. The Plane of Focus:</strong>{' '}
                At any focus setting, only a single 2D slice of space is truly
                in focus. Rays from a point on that plane refract through the
                lens elements and converge to a{' '}
                <strong className="text-emerald-300">single sharp point</strong>{' '}
                on the Ground Glass Image Plane.
              </p>
              <p>
                <strong className="text-white">
                  2. Circles of Confusion (Blur Discs):
                </strong>{' '}
                Objects in front of or behind the Plane of Focus converge either
                behind or in front of the sensor. When their ray cones hit the
                glass, they form circular discs — which your eye perceives as
                optical blur.
              </p>
              <p>
                <strong className="text-white">
                  3. Aperture &amp; Depth of Field:
                </strong>{' '}
                Stopping down the aperture blades from{' '}
                <span className="font-mono-tabular text-white">f/2</span> to{' '}
                <span className="font-mono-tabular text-white">f/16</span>{' '}
                narrows the ray cone. Narrower cones produce smaller discs on
                the sensor, expanding the{' '}
                <strong className="text-sky-300">Sharp Zone</strong>.
              </p>

              <div className="pt-2 border-t border-white/10">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Controls &amp; Shortcuts
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-[11.5px]">
                  <span className="text-white/60">Focus Presets</span>
                  <span className="font-mono-tabular text-white text-right">
                    1 / 2 / 3
                  </span>
                  <span className="text-white/60">Scrub Focus Ring</span>
                  <span className="font-mono-tabular text-white text-right">
                    Drag 3D Ring or ← / →
                  </span>
                  <span className="text-white/60">
                    Aperture (f/2, f/5.6, f/16)
                  </span>
                  <span className="font-mono-tabular text-white text-right">
                    Q / W / E
                  </span>
                  <span className="text-white/60">
                    Assembled / Exploded View
                  </span>
                  <span className="font-mono-tabular text-white text-right">
                    Space / Tab
                  </span>
                  <span className="text-white/60">Inspect Image Plane</span>
                  <span className="font-mono-tabular text-white text-right">
                    Click Ground Glass / V
                  </span>
                  <span className="text-white/60">Hide / Show HUD</span>
                  <span className="font-mono-tabular text-white text-right">
                    H
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
