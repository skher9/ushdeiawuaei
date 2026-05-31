"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { setSoundEnabled } from "@/lib/sound";

export function getLevel(xp: number): string {
  if (xp >= 6000) return "Brainrot Legend";
  if (xp >= 3000) return "Code Ronin";
  if (xp >= 1500) return "Algorithm Apprentice";
  if (xp >= 500) return "Sorting Padawan";
  return "Rookie Dev";
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

interface StoredState {
  xp: number;
  streak: number;
  lastDate: string;
  soundEnabled: boolean;
  bestAccuracy: number;
}

function loadStored(): StoredState {
  try {
    const raw = localStorage.getItem("brainrot_v1");
    if (raw) return JSON.parse(raw) as StoredState;
  } catch {}
  return { xp: 0, streak: 0, lastDate: "", soundEnabled: false, bestAccuracy: 0 };
}

function patchStored(patch: Partial<StoredState>) {
  try {
    const cur = loadStored();
    localStorage.setItem("brainrot_v1", JSON.stringify({ ...cur, ...patch }));
  } catch {}
}

interface XPCtx {
  xp: number;
  addXP: (n: number) => void;
  streak: number;
  level: string;
  levelUpEvent: string | null;
  clearLevelUp: () => void;
  currentSection: number;
  goToSection: (n: number) => void;
  sectionComplete: boolean[];
  markComplete: (i: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  sessionStartTime: number;
  totalSessionXP: number;
  sessionAccuracy: number | null;
  setSessionAccuracy: (v: number) => void;
  bestAccuracy: number;
}

const Ctx = createContext<XPCtx | null>(null);

export function XPProvider({ children }: { children: ReactNode }) {
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [soundEnabled, setSoundState] = useState(false);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [currentSection, setSection] = useState(0);
  const [sectionComplete, setSectionComplete] = useState(
    Array(6).fill(false) as boolean[]
  );
  const [levelUpEvent, setLevelUpEvent] = useState<string | null>(null);
  const [sessionStartTime] = useState(() => Date.now());
  const [totalSessionXP, setTotalSessionXP] = useState(0);
  const [sessionAccuracy, setAccuracy] = useState<number | null>(null);

  // Load persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    const s = loadStored();
    setXP(s.xp);
    setStreak(s.streak);
    setBestAccuracy(s.bestAccuracy);
    setSoundState(s.soundEnabled);
    setSoundEnabled(s.soundEnabled);
  }, []);

  const addXP = useCallback((n: number) => {
    setXP((prev) => {
      const next = prev + n;
      patchStored({ xp: next });
      const prevLevel = getLevel(prev);
      const nextLevel = getLevel(next);
      if (nextLevel !== prevLevel) {
        setLevelUpEvent(nextLevel);
      }
      return next;
    });
    setTotalSessionXP((p) => p + n);
  }, []);

  const clearLevelUp = useCallback(() => setLevelUpEvent(null), []);

  const goToSection = useCallback((n: number) => setSection(n), []);

  const markComplete = useCallback((i: number) => {
    setSectionComplete((p) => {
      const a = [...p];
      a[i] = true;
      return a;
    });
    // Streak: increment if first completion today
    const s = loadStored();
    const today = todayStr();
    if (s.lastDate !== today) {
      const newStreak = s.lastDate === yesterdayStr() ? s.streak + 1 : 1;
      setStreak(newStreak);
      patchStored({ streak: newStreak, lastDate: today });
    }
  }, []);

  const setSessionAccuracy = useCallback((v: number) => {
    setAccuracy(v);
    const s = loadStored();
    if (v > s.bestAccuracy) {
      setBestAccuracy(v);
      patchStored({ bestAccuracy: v });
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      patchStored({ soundEnabled: next });
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        xp,
        addXP,
        streak,
        level: getLevel(xp),
        levelUpEvent,
        clearLevelUp,
        currentSection,
        goToSection,
        sectionComplete,
        markComplete,
        soundEnabled,
        toggleSound,
        sessionStartTime,
        totalSessionXP,
        sessionAccuracy,
        setSessionAccuracy,
        bestAccuracy,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useXP() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useXP outside XPProvider");
  return c;
}
