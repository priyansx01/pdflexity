"use client";

import * as React from "react";
import { Check, Target } from "lucide-react";

import type { CompressSettings } from "../types";
import { PRESETS, fmtBytes } from "../constants";
import { cn } from "@/lib/utils";

/**
 * Step 2 body — three preset suggestion cards, a draggable level slider that
 * snaps to presets, and a custom target-size mode. Cards, slider, and custom
 * input stay in sync; the whole panel dims while running.
 */
export function PresetPanel({
  settings,
  onChange,
  originalBytes,
  disabled,
}: {
  settings: CompressSettings;
  onChange: (s: CompressSettings) => void;
  originalBytes: number;
  disabled?: boolean;
}) {
  const preset = settings.preset;
  const activePreset = preset === "custom" ? null : PRESETS.find((p) => p.id === preset) ?? null;
  const sliderValue = activePreset?.position ?? 50;

  const choose = (id: CompressSettings["preset"]) => onChange({ ...settings, preset: id });

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-hairline bg-surface p-4",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      {/* Preset cards */}
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Compression level">
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(p.id)}
              className={cn(
                "relative rounded-lg border p-3 text-left transition-colors",
                active
                  ? "border-emerald/60 bg-emerald-soft/50"
                  : "border-hairline bg-surface-raised/40 hover:border-emerald/30"
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald">
                  <Check className="h-3 w-3 text-emerald-foreground" />
                </span>
              )}
              <p className={cn("pr-5 text-[13px] font-semibold", active && "text-emerald")}>{p.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.description}</p>
            </button>
          );
        })}
      </div>

      {/* Draggable level bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-caps">Compression level</span>
          <span className="tnum text-[11px] text-muted-foreground">
            {activePreset ? activePreset.label : "Custom"}
          </span>
        </div>
        <LevelSlider
          value={sliderValue}
          disabled={preset === "custom"}
          onSnap={(pos) => {
            const nearest = PRESETS.reduce((a, b) =>
              Math.abs(b.position - pos) < Math.abs(a.position - pos) ? b : a
            );
            choose(nearest.id);
          }}
          onGrab={() => choose(PRESETS[1].id)} // dragging from custom snaps back into preset mode
        />
      </div>

      {/* Custom target size */}
      <div
        className={cn(
          "rounded-lg border p-3",
          preset === "custom" ? "border-emerald/50 bg-emerald-soft/30" : "border-hairline"
        )}
      >
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={preset === "custom"}
            onChange={(e) => choose(e.target.checked ? "custom" : "recommended")}
            className="h-4 w-4 accent-[var(--emerald)]"
          />
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-medium">Custom size</span>
          <span className="text-[11px] text-muted-foreground">
            aim for a target file size
          </span>
        </label>

        {preset === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={settings.targetSizeMb}
              onChange={(e) =>
                onChange({ ...settings, targetSizeMb: Math.max(0.1, Number(e.target.value) || 0.1) })
              }
              aria-label="Target size in megabytes"
              className="tnum w-24 rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-[13px] outline-none focus:border-emerald"
            />
            <span className="text-[12px] text-muted-foreground">MB target</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              original {fmtBytes(originalBytes)} · best effort if unreachable
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A draggable bar with three snap stops (0/50/100 = less/recommended/extreme).
 * Pointer-driven; keyboard-accessible via role=slider + arrow keys.
 */
function LevelSlider({
  value,
  disabled,
  onSnap,
  onGrab,
}: {
  value: number;
  disabled?: boolean;
  onSnap: (position: number) => void;
  onGrab: () => void;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const positionFromEvent = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 50;
    const rect = track.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const snapToNearest = (pos: number) => {
    const nearest = PRESETS.reduce((a, b) =>
      Math.abs(b.position - pos) < Math.abs(a.position - pos) ? b : a
    );
    onSnap(nearest.position);
  };

  // Global pointer listeners while dragging.
  React.useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      // Live thumb is cosmetic; commit on release.
      const pos = positionFromEvent(e.clientX);
      setPreview(pos);
    };
    const up = (e: PointerEvent) => {
      setDragging(false);
      snapToNearest(positionFromEvent(e.clientX));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const [preview, setPreview] = React.useState<number | null>(null);
  const shown = preview ?? value;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Compression level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={PRESETS.find((p) => p.position === value)?.label ?? "Custom"}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        onGrab();
        setDragging(true);
        setPreview(positionFromEvent(e.clientX));
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const order = [0, 50, 100];
          const idx = order.findIndex((v) => v === value);
          const next = e.key === "ArrowRight" ? Math.min(2, idx + 1) : Math.max(0, idx - 1);
          snapToNearest(order[next]);
        }
      }}
      className={cn(
        "relative h-6 w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald/50",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      )}
    >
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-raised" />
      {/* Fill */}
      <div
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-emerald transition-[width] duration-150"
        style={{ width: `${shown}%` }}
      />
      {/* Stops */}
      {PRESETS.map((p) => (
        <span
          key={p.id}
          className={cn(
            "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border",
            Math.abs(shown - p.position) < 12
              ? "border-emerald bg-emerald"
              : "border-hairline bg-surface"
          )}
          style={{ left: `${p.position}%` }}
        />
      ))}
      {/* Thumb */}
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background shadow-sm transition-[left] duration-150",
          dragging ? "border-emerald scale-110" : "border-emerald"
        )}
        style={{ left: `${shown}%` }}
      />
      {/* Stop labels */}
      <div className="pointer-events-none absolute inset-x-0 top-full mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>Less</span>
        <span>Recommended</span>
        <span>Extreme</span>
      </div>
    </div>
  );
}
