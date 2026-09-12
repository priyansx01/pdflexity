"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getElectronAPI, type FeatureInstallProgress } from "@/lib/backend-types";
import { getErrorMessage } from "@/lib/utils";
import { notify, isWindowVisible } from "@/lib/desktop";

type Phase = FeatureInstallProgress["phase"];

/**
 * Drives an on-demand feature pack (e.g. OCR): checks install status, runs the
 * download+extract install with progress, and exposes state for the gate UI.
 */
export function useFeatureInstall(id: string) {
  const [installed, setInstalled] = useState<boolean | null>(null); // null = checking
  const [available, setAvailable] = useState(true);
  const [version, setVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [phase, setPhase] = useState<Phase>("download");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    const api = getElectronAPI()?.feature;
    if (!api) {
      setInstalled(false);
      return;
    }
    try {
      const s = await api.status(id);
      setInstalled(s.installed);
      setAvailable(s.available ?? true);
      setVersion(s.version ?? null);
    } catch {
      setInstalled(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to install progress for the lifetime of the hook.
  useEffect(() => {
    const api = getElectronAPI()?.feature;
    if (!api) return;
    let cancelled = false;
    api
      .onInstallProgress((data) => {
        if (data.id !== id) return;
        setPhase(data.phase);
        setPct(data.pct);
      })
      .then((un) => {
        if (cancelled) un();
        else unlistenRef.current = un;
      });
    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [id]);

  const install = useCallback(async () => {
    const api = getElectronAPI()?.feature;
    if (!api) return;
    setInstalling(true);
    setError(null);
    setPhase("download");
    setPct(0);
    try {
      const res = await api.install(id);
      if (res.success) {
        setInstalled(true);
        isWindowVisible().then((v) => {
          if (!v) notify("OCR ready", "The OCR feature finished installing.");
        });
      } else {
        setError(res.error || "Install failed");
      }
    } catch (e) {
      setError(getErrorMessage(e) || "Install failed");
    } finally {
      setInstalling(false);
    }
  }, [id]);

  const uninstall = useCallback(async () => {
    const api = getElectronAPI()?.feature;
    if (!api) return;
    setUninstalling(true);
    setError(null);
    try {
      const res = await api.uninstall(id);
      if (res.success) setInstalled(false);
      else setError(res.error || "Uninstall failed");
    } catch (e) {
      setError(getErrorMessage(e) || "Uninstall failed");
    } finally {
      setUninstalling(false);
    }
  }, [id]);

  return {
    installed,
    available,
    version,
    installing,
    uninstalling,
    phase,
    pct,
    error,
    install,
    uninstall,
    refresh,
  };
}
