"use client";

import { Volume2, VolumeX } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { sound } from "@/lib/sound";

const muteKey = "flarewise.muted";

type SoundCtx = {
  muted: boolean;
  started: boolean;
  toggleMute: () => void;
};

const SoundContext = createContext<SoundCtx>({
  muted: false,
  started: false,
  toggleMute: () => undefined
});

export function useSound() {
  return useContext(SoundContext);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  
  useEffect(() => {
    const saved = window.localStorage.getItem(muteKey);
    if (saved === "1") {
      setMuted(true);
      sound.setMuted(true);
    }
  }, []);
  
  useEffect(() => {
    let active = true;

    async function kick() {
      if (!active) return;
      await sound.startOnGesture();
      if (sound.isStarted()) {
        setStarted(true);
        window.removeEventListener("pointerdown", kick);
        window.removeEventListener("keydown", kick);
      }
    }

    window.addEventListener("pointerdown", kick, { once: false });
    window.addEventListener("keydown", kick, { once: false });

    return () => {
      active = false;
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const hit = target?.closest<HTMLElement>("[data-sound]");
      if (!hit) return;
      const kind = hit.dataset.sound;
      if (kind === "send") sound.send();
      else if (kind === "success") sound.success();
      else sound.click();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      sound.setMuted(next);
      window.localStorage.setItem(muteKey, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ muted, started, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
}
export function SoundToggle() {
  const { muted, started, toggleMute } = useSound();

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "Unmute ambient sound" : "Mute ambient sound"}
      title={muted ? "Sound off" : started ? "Sound on" : "Tap anywhere to start sound"}
      data-sound="click"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
    >
      {muted || !started ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}
