"use client"

import * as React from "react"
import { Eye, EyeOff, AlertCircle, AlertTriangle, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PasswordInputProps } from "../types"

export function PasswordInput({
  value, onChange, showPassword, onToggleShow,
  hasError, errorMessage, disabled, onSubmit,
}: PasswordInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [capsLock, setCapsLock] = React.useState(false)
  const [focused, setFocused] = React.useState(false)

  React.useEffect(() => { if (!disabled) inputRef.current?.focus() }, [disabled])

  const len = value.length
  const strength = len === 0 ? 0 : len < 5 ? 1 : len < 10 ? 2 : 3
  const strengthColors = ["bg-border", "bg-red-400", "bg-amber-400", "bg-green-400"]

  return (
    <div className="space-y-3">
      <div className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-200 border",
        disabled && "opacity-50 pointer-events-none",
        hasError
          ? "border-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
          : focused
            ? "border-[#10b981]/60 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
            : "border-border hover:border-border/80"
      )}>
        <div className="absolute inset-0 bg-muted/30 dark:bg-white/[0.04]" />
        {focused && !hasError && (
          <div className="pointer-events-none absolute inset-0 bg-[#10b981]/[0.04]" />
        )}

        <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
          <KeyRound className={cn(
            "h-4 w-4 transition-colors duration-200",
            hasError ? "text-red-400/70" : focused ? "text-[#34d399]/80" : "text-muted-foreground/40"
          )} />
        </div>

        <input
          ref={inputRef}
          id="pdf-password"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            setCapsLock(e.getModifierState("CapsLock"))
            if (e.key === "Enter" && value.trim()) onSubmit()
          }}
          disabled={disabled}
          placeholder="Enter PDF password…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? "password-error" : undefined}
          className="relative w-full bg-transparent py-3.5 pl-10 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none"
        />

        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground/40 transition-all duration-150 hover:bg-muted/60 dark:hover:bg-white/8 hover:text-muted-foreground disabled:pointer-events-none"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {value.length > 0 && !hasError && (
        <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <div key={n} className={cn("h-1 w-8 rounded-full transition-all duration-300", strength >= n ? strengthColors[strength] : "bg-border")} />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground/50">
            {strength === 1 ? "Weak" : strength === 2 ? "Fair" : "Strong"}
          </span>
        </div>
      )}

      {capsLock && !hasError && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/8 px-3 py-2 ring-1 ring-amber-500/15 animate-in fade-in-0 duration-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400/90">Caps Lock is on</span>
        </div>
      )}

      {hasError && errorMessage && (
        <div id="password-error" role="alert" className="flex items-center gap-2 rounded-lg bg-red-500/8 px-3 py-2 ring-1 ring-red-500/15 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400/90">{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
