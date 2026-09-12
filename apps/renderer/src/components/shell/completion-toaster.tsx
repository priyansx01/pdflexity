"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";

import { useWorkspaceStore, type CompletedJob } from "@/stores/use-workspace-store";
import { getTool } from "@/lib/tools";
import { playChime } from "@/lib/sound";
import { isWindowVisible, notify } from "@/lib/desktop";

interface Toast extends CompletedJob {
  id: number;
}

const AUTO_DISMISS_MS = 5000;

/**
 * Global completion notifier. Watches the workspace store's `lastCompleted`
 * signal — set when a background job finishes — and shows a toast + plays a
 * chime, regardless of which tool the user is currently viewing.
 */
export function CompletionToaster() {
  const router = useRouter();
  const lastCompleted = useWorkspaceStore((s) => s.lastCompleted);
  const clearCompleted = useWorkspaceStore((s) => s.clearCompleted);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  // Consume-and-clear: turn each completion signal into a toast + chime once.
  React.useEffect(() => {
    if (!lastCompleted) return;
    const job = lastCompleted;
    const id = ++idRef.current;
    setToasts((t) => [...t, { ...job, id }]);
    playChime();
    // When the window is hidden in the tray the in-app toast isn't visible, so
    // also raise a native OS notification.
    isWindowVisible().then((visible) => {
      if (!visible) notify(`${job.toolName} complete`, job.fileName);
    });
    clearCompleted();
  }, [lastCompleted, clearCompleted]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const view = React.useCallback(
    (toast: Toast) => {
      const href = getTool(toast.toolId)?.href;
      if (href) router.push(href);
      dismiss(toast.id);
    },
    [router, dismiss]
  );

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onView={view} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onView,
  onDismiss,
}: {
  toast: Toast;
  onView: (t: Toast) => void;
  onDismiss: (id: number) => void;
}) {
  // Each toast owns its auto-dismiss timer so it isn't cancelled by the
  // consume-effect above re-running.
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-hairline bg-surface p-3 shadow-lg"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-soft">
        <CheckCircle2 className="h-4 w-4 text-emerald" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{toast.toolName} complete</p>
        <p className="truncate text-[12px] text-muted-foreground">{toast.fileName}</p>
        <button
          type="button"
          onClick={() => onView(toast)}
          className="mt-1.5 text-[12px] font-medium text-emerald hover:underline"
        >
          View
        </button>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
