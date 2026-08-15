"use client";

import * as React from "react";
import { motion } from "motion/react";
import type { ToolOption } from "@/lib/tools";
import { cn } from "@/lib/utils";

export type OptionValues = Record<string, string | boolean>;

const KNOB_SPRING = { type: "spring" as const, stiffness: 600, damping: 34 };
const THUMB_SPRING = { type: "spring" as const, stiffness: 500, damping: 40 };

/** Renders a tool's options into a single hairline card with divided rows. */
export function OptionsPanel({
  options,
  values,
  onChange,
  dimmed,
}: {
  options: ToolOption[];
  values: OptionValues;
  onChange: (next: OptionValues) => void;
  dimmed?: boolean;
}) {
  if (!options.length) return null;
  const set = (id: string, v: string | boolean) => onChange({ ...values, [id]: v });

  return (
    <div
      className={cn(
        "divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-surface transition-opacity",
        dimmed && "pointer-events-none opacity-60"
      )}
    >
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{opt.label}</p>
            {"hint" in opt && opt.hint && (
              <p className="text-[11px] text-muted-foreground">{opt.hint}</p>
            )}
          </div>
          <div className="shrink-0">
            {opt.kind === "password" && (
              <PasswordInput
                value={String(values[opt.id] ?? "")}
                onChange={(v) => set(opt.id, v)}
              />
            )}
            {opt.kind === "toggle" && (
              <Toggle
                checked={Boolean(values[opt.id] ?? opt.defaultOn)}
                onChange={(v) => set(opt.id, v)}
                ariaLabel={opt.label}
              />
            )}
            {opt.kind === "segment" && (
              <Segment
                ariaLabel={opt.label}
                choices={opt.choices}
                value={String(values[opt.id] ?? opt.defaultChoice)}
                onChange={(v) => set(opt.id, v)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sane defaults derived from a tool's option schema. */
export function defaultOptionValues(options: ToolOption[]): OptionValues {
  const v: OptionValues = {};
  for (const opt of options) {
    if (opt.kind === "toggle") v[opt.id] = opt.defaultOn ?? false;
    else if (opt.kind === "segment") v[opt.id] = opt.defaultChoice;
    else v[opt.id] = "";
  }
  return v;
}

// ── Primitives ───────────────────────────────────────────────────────────────

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="password"
      value={value}
      placeholder="••••••••"
      onChange={(e) => onChange(e.target.value)}
      className="w-44 rounded-md border border-hairline bg-surface-raised px-2.5 py-1.5 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-emerald"
    />
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald/50",
        checked ? "bg-emerald" : "bg-surface-raised"
      )}
    >
      <motion.span
        layout
        transition={KNOB_SPRING}
        className={cn("block h-4 w-4 rounded-full bg-white shadow-sm", checked && "shadow-emerald-500/20")}
        style={{ marginLeft: checked ? undefined : 0 }}
      />
    </button>
  );
}

function Segment({
  choices,
  value,
  onChange,
  ariaLabel,
}: {
  choices: string[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="relative flex rounded-md border border-hairline bg-surface-raised p-0.5">
      {choices.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c)}
            className="relative rounded-[5px] px-2.5 py-1 text-[12px] transition-colors"
          >
            {active && (
              <motion.span
                layoutId={`seg-${ariaLabel}`}
                transition={THUMB_SPRING}
                className="absolute inset-0 rounded-[5px] bg-emerald"
              />
            )}
            <span className={cn("relative", active ? "text-emerald-foreground" : "text-muted-foreground")}>
              {c}
            </span>
          </button>
        );
      })}
    </div>
  );
}
