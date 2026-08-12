"use client"

import { Eye, EyeOff, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PasswordFieldProps } from "../types"

export function PasswordField({
  id, placeholder, value, show, onToggleShow, onChange, hasError = false,
}: PasswordFieldProps) {
  return (
    <div className={cn(
      "relative flex items-center rounded-xl border transition-all duration-200",
      "bg-muted/30 dark:bg-white/[0.04]",
      hasError
        ? "border-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
        : "border-border dark:border-white/10 focus-within:border-[#10b981]/60 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
    )}>
      <KeyRound className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="flex-1 bg-transparent py-3.5 pl-2.5 pr-2 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="mr-2 rounded-lg p-1.5 text-muted-foreground/40 transition-all hover:bg-muted/60 hover:text-muted-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
