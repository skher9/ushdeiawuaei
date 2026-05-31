"use client";
// LC #410 — GRID ZERO: 3D city. Set truck capacity. Binary search the minimum.
import { useEffect, useRef, useState, useCallback } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 8;
const K = 3;
const TIMER_TOTAL = 90;
const TEAM_HEX3 = [0x3b82f6, 0xf97316, 0xa855f7] as const;
const TEAM_CSS = ["#3b82f6", "#f97316", "#a855f7"] as const;

function genDistricts(): number[] {
  let a: number[];
  do { a = Array.from({ length: N }, () => 3 + Math.floor(Math.random() * 13)); }
  while (Math.max(...a) > a.reduce((s, v) => s + v, 0) * 0.6);
  return a;
}
function canLoad(d: number[], cap: number, k: number): boolean {
  let t = 1, c = 0;
  for (const v of d) { if (v > cap) return false; if (c + v > cap) { if (++t > k) return false; c = v; } else c += v; }
  return true;
}
function findOptimal(d: number[], k: number): number {
  let lo = Math.max(...d), hi = d.reduce((a, b) => a + b, 0);
  while (lo < hi) { const m = (lo + hi) >> 1; if (canLoad(d, m, k)) hi = m; else lo = m + 1; }
  return lo;
}
function getAssignments(d: number[], cap: number): number[] {
  let t = 0, c = 0;
  return d.map(v => { if (c + v > cap) { t = Math.min(t + 1, K - 1); c = v; } else c += v; return t; });
}
function trucksFor(d: number[], cap: number): number {
  let t = 1, c = 0;
  for (const v of d) { if (c + v > cap) { t++; c = v; } else c += v; }
  return t;
}

// -- inner game --
interface InnerProps extends GameProps { onRestart: () => void; }

function GridZeroGame({ onSolve, onAttempt, onRestart }: InnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const solvedRef = useRef(false);
  const phaseRef = useRef<string>("idle");

  const [gd] = useState(() => {
    const d = genDistricts();
    const opt = findOptimal(d, K);
    const sum = d.reduce((a, b) => a + b, 0);
    const maxD = Math.max(...d);
    return { d, opt, sum, maxD };
  });
  const { d: DIST, opt: OPTIMAL, sum: SUM, maxD: MAX_D } = gd;
  const optGuesses = Math.ceil(Math.log2(Math.max(2, SUM - MAX_D + 1)));

  const [briefDismissed, setBriefDismissed] = useState(false);
  const [cap, setCap] = useState(() => Math.round((MAX_D + SUM) / 2));
  const [timeLeft, setTimeLeft] = useState(TIMER_TOTAL);
  const [attempts, setAttempts] = useState(0);
  const [phase, setPhase] = useState("brief"); // starts in brief
  const [guesses, setGuesses] = useState<{ cap: number; ok: boolean }[]>([]);
  const [msg, setMsg] = useState<{ type: "stable" | "blackout"; main: string; sub: string; suggest?: number } | null>(null);

  const actionsRef = useRef<{
    deploy: (asgn: number[], feasible: boolean, overAt: number, done: () => void) => void;
    stable: (asgn: number[]) => void;
    blackout: () => void;
    win: (asgn: number[]) => void;
    reset: () => void;
  } | null>(null);
  const effectTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const effectIntervals = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ------ Three.js setup ------
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    let cancelled = false;
    let animId = 0;
    let disposeRenderer: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      if (cancelled) return;

      const canvas = canvasRef.current!;
      const cont = containerRef.current!;
      const W = cont.clientWidth || 800;
      const H = cont.clientHeight || 420;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x030308);
      scene.fog = new THREE.Fog(0x030308, 45, 90);

      const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
      camera.position.set(0, 8, 22);
      camera.lookAt(0, 2, 0);

      // Lights
      scene.add(new THREE.AmbientLight(0x080818, 1.4));
      const moon = new THREE.DirectionalLight(0x1c2a40, 0.5);
      moon.position.set(-6, 12, 8);
      moon.castShadow = true;
      moon.shadow.mapSize.set(1024, 1024);
      scene.add(moon);
      const streetGlow = new THREE.PointLight(0x0a0a2a, 0.4, 30);
      streetGlow.position.set(0, 0.5, 3);
      scene.add(streetGlow);

      // Ground
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 60),
        new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      const grid = new THREE.GridHelper(100, 100, 0x0b0b1c, 0x0b0b1c);
      grid.position.y = 0.01;
      scene.add(grid);

      // Buildings
      const SPACING = 3.1;
      const startX = -((N - 1) * SPACING) / 2;
      const bMats: any[] = [];
      const bLights: any[] = [];
      const winMats: any[][] = [];

      for (let i = 0; i < N; i++) {
        const demand = DIST[i];
        const bh = 1.5 + demand * 0.25;
        const x = startX + i * SPACING;

        const mat = new THREE.MeshStandardMaterial({ color: 0x0c0c1e, emissive: 0x050510, roughness: 0.85 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, bh, 2.3), mat);
        mesh.position.set(x, bh / 2, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        bMats.push(mat);

        // Window panes (front face)
        const rows = Math.min(4, Math.max(1, Math.floor(bh * 0.9)));
        const wRow: any[] = [];
        for (let wr = 0; wr < rows; wr++) {
          for (let wc = 0; wc < 2; wc++) {
            const wm = new THREE.MeshBasicMaterial({ color: 0x07071a });
            const wp = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.28), wm);
            wp.position.set(x + (-0.34 + wc * 0.68), 0.38 + wr * 0.88, 1.16);
            scene.add(wp);
            wRow.push(wm);
          }
        }
        winMats.push(wRow);

        const pl = new THREE.PointLight(0x000000, 0, 8);
        pl.position.set(x, bh + 0.8, 0.5);
        scene.add(pl);
        bLights.push(pl);
      }

      // Storm clouds
      const clouds: { mesh: any; speed: number }[] = [];
      for (let c = 0; c < 8; c++) {
        const cm = new THREE.Mesh(
          new THREE.PlaneGeometry(18 + Math.random() * 14, 5 + Math.random() * 5),
          new THREE.MeshBasicMaterial({ color: 0x030312, transparent: true, opacity: 0.5 + Math.random() * 0.35, side: THREE.DoubleSide })
        );
        cm.position.set((Math.random() - 0.5) * 55, 9 + Math.random() * 8, -14 - Math.random() * 20);
        scene.add(cm);
        clouds.push({ mesh: cm, speed: 0.004 + Math.random() * 0.004 });
      }

      // Emergency lights (hidden until blackout)
      const emergencyLights: any[] = [];
      for (let e = 0; e < 4; e++) {
        const el = new THREE.PointLight(0xcc0000, 0, 18);
        el.position.set(-12 + e * 8, 0.4, 2.5);
        scene.add(el);
        emergencyLights.push(el);
      }

      // Lightning flash plane
      const flashMat = new THREE.MeshBasicMaterial({ color: 0x2233bb, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), flashMat);
      flash.position.set(0, 6, 4);
      flash.rotation.x = -0.4;
      scene.add(flash);

      // Helpers
      function setLit(i: number, col: number, intensity: number) {
        const c = new THREE.Color(col);
        bMats[i].emissive.copy(c).multiplyScalar(0.22);
        bLights[i].color.setHex(col);
        bLights[i].intensity = intensity;
        winMats[i].forEach(m => m.color.copy(c).multiplyScalar(0.55));
      }
      function setDark(i: number) {
        bMats[i].emissive.setHex(0x050510);
        bLights[i].intensity = 0;
        winMats[i].forEach(m => m.color.setHex(0x070718));
      }
      function setOverload(i: number) {
        bMats[i].emissive.setHex(0x3a0000);
        bLights[i].color.setHex(0xff2200);
        bLights[i].intensity = 0.7;
        winMats[i].forEach(m => m.color.setHex(0x3a0000));
      }
      function clearEffects() {
        effectTimers.current.forEach(clearTimeout);
        effectIntervals.current.forEach(clearInterval);
        effectTimers.current = [];
        effectIntervals.current = [];
      }

      actionsRef.current = {
        reset: () => {
          clearEffects();
          for (let i = 0; i < N; i++) setDark(i);
          emergencyLights.forEach(el => { el.intensity = 0; });
          scene.background = new THREE.Color(0x030308);
          scene.fog = new THREE.Fog(0x030308, 45, 90);
          flashMat.opacity = 0;
          streetGlow.color.setHex(0x0a0a2a);
          streetGlow.intensity = 0.4;
        },
        deploy: (asgn, feasible, overAt, done) => {
          clearEffects();
          let i = 0;
          function step() {
            if (i >= N) { const t = setTimeout(done, 300); effectTimers.current.push(t); return; }
            const over = !feasible && overAt >= 0 && i >= overAt;
            if (over) setOverload(i);
            else setLit(i, TEAM_HEX3[asgn[i]] ?? 0x3b82f6, 1.3);
            i++;
            const t = setTimeout(step, 155);
            effectTimers.current.push(t);
          }
          step();
        },
        stable: (asgn) => {
          clearEffects();
          for (let i = 0; i < N; i++) setLit(i, TEAM_HEX3[asgn[i]] ?? 0x3b82f6, 1.6);
          scene.background = new THREE.Color(0x030308);
          if (scene.fog instanceof THREE.FogExp2) scene.fog = new THREE.Fog(0x030308, 45, 90);
          emergencyLights.forEach(el => { el.intensity = 0; });
          streetGlow.color.setHex(0x0a1a0a);
        },
        blackout: () => {
          clearEffects();
          for (let i = 0; i < N; i++) setDark(i);
          let step = 0;
          const iv = setInterval(() => {
            step++;
            const b = Math.max(0, 1 - step * 0.28);
            scene.background = new THREE.Color().setRGB(0.012 * b, 0.012 * b, 0.032 * b);
            if (step >= 4) {
              clearInterval(iv);
              scene.fog = new THREE.FogExp2(0x050000, 0.025);
              emergencyLights.forEach(el => { el.intensity = 1.6; });
              // lightning flicker
              let lf = 0;
              const lfIv = setInterval(() => {
                lf++;
                flashMat.opacity = lf % 2 === 0 ? 0.1 : 0;
                if (lf >= 6) { clearInterval(lfIv); flashMat.opacity = 0; }
              }, 140);
              effectIntervals.current.push(lfIv);
            }
          }, 90);
          effectIntervals.current.push(iv);
        },
        win: (asgn) => {
          clearEffects();
          for (let i = 0; i < N; i++) setLit(i, TEAM_HEX3[asgn[i]] ?? 0x3b82f6, 2.8);
          scene.background = new THREE.Color(0x030308);
          if (scene.fog instanceof THREE.FogExp2) scene.fog = new THREE.Fog(0x030308, 45, 90);
          emergencyLights.forEach(el => { el.intensity = 0; });
          streetGlow.color.setHex(0x0a200a);
          streetGlow.intensity = 1.0;
          // pulse
          let pf = 0;
          const pIv = setInterval(() => {
            pf++;
            bLights.forEach((l, idx) => { l.intensity = 2.2 + Math.sin(pf * 0.35 + idx * 0.6) * 0.6; });
            if (pf > 60) clearInterval(pIv);
          }, 55);
          effectIntervals.current.push(pIv);
        },
      };

      // Resize
      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      // Animate
      let frame = 0;
      function tick() {
        animId = requestAnimationFrame(tick);
        frame++;
        clouds.forEach(({ mesh, speed }) => {
          mesh.position.z += speed;
          if (mesh.position.z > 2) mesh.position.z = -18 - Math.random() * 14;
        });
        camera.position.y = 8 + Math.sin(frame * 0.005) * 0.07;
        camera.lookAt(0, 2, 0);
        renderer.render(scene, camera);
      }
      tick();

      disposeRenderer = () => {
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(animId);
        renderer.dispose();
      };
    })();

    return () => {
      cancelled = true;
      disposeRenderer?.();
    };
  }, [DIST]);

  // Timer
  useEffect(() => {
    if (phase === "win" || phase === "over") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        if (next <= 0 && !solvedRef.current && phaseRef.current !== "win") {
          setPhase("over");
          return 0;
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Deploy
  const doDeploy = useCallback(() => {
    if (phase !== "idle" || solvedRef.current || !actionsRef.current) return;
    setPhase("deploying");

    const asgn = getAssignments(DIST, cap);
    const trucks = trucksFor(DIST, cap);
    const feasible = trucks <= K;
    let overAt = -1;
    if (!feasible) {
      let t = 0, c = 0;
      for (let i = 0; i < N; i++) {
        if (c + DIST[i] > cap) { t++; c = DIST[i]; if (t > K && overAt < 0) overAt = i; }
        else c += DIST[i];
      }
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    onAttempt();
    const newGuesses = [...guesses, { cap, ok: feasible }];
    setGuesses(newGuesses);

    actionsRef.current.deploy(asgn, feasible, overAt, () => {
      if (feasible) {
        actionsRef.current!.stable(asgn);
        if (cap === OPTIMAL) {
          actionsRef.current!.win(asgn);
          solvedRef.current = true;
          setPhase("win");
          playSound("solve");
          emitReaction("BURST", `${OPTIMAL} MW`, 0, 0);
        } else {
          const maxFail = newGuesses.filter(g => !g.ok).reduce((m, g) => Math.max(m, g.cap), MAX_D - 1);
          const sug = Math.floor((maxFail + cap) / 2);
          setMsg({ type: "stable", main: "GRID STABLE ✓", sub: `${cap} MW works — can you go lower?`, suggest: sug >= MAX_D && sug < cap ? sug : undefined });
          setPhase("feedback");
          playSound("correct");
          const t = setTimeout(() => { actionsRef.current?.reset(); setMsg(null); setPhase("idle"); }, 2800);
          effectTimers.current.push(t);
        }
      } else {
        actionsRef.current!.blackout();
        const minWork = newGuesses.filter(g => g.ok).reduce((m, g) => Math.min(m, g.cap), SUM + 1);
        const sug = minWork <= SUM ? Math.floor((cap + minWork) / 2) : Math.floor((cap + SUM) / 2);
        setMsg({ type: "blackout", main: "⚡ GRID FAILURE", sub: `${cap} MW — needed ${trucks} trucks, have ${K}`, suggest: sug <= SUM ? sug : undefined });
        setPhase("feedback");
        playSound("wrong");
        emitReaction("DANGER", "OVERLOAD", 0, 0);
        const t = setTimeout(() => { actionsRef.current?.reset(); setMsg(null); setPhase("idle"); }, 2700);
        effectTimers.current.push(t);
      }
    });
  }, [phase, cap, attempts, guesses, DIST, OPTIMAL, SUM, MAX_D, onAttempt]);

  const adjCap = useCallback((d: number) => {
    if (phase !== "idle") return;
    setCap(c => Math.max(MAX_D, Math.min(SUM, c + d)));
  }, [phase, MAX_D, SUM]);

  // Number line
  const nlRange = SUM - MAX_D;
  const toNlPct = (v: number) => nlRange > 0 ? `${((v - MAX_D) / nlRange) * 100}%` : "50%";
  const showNl = attempts >= 3;
  const nlFails = guesses.filter(g => !g.ok).map(g => g.cap);
  const nlWorks = guesses.filter(g => g.ok).map(g => g.cap);
  const nlMaxFail = nlFails.length ? Math.max(...nlFails) : -1;
  const nlMinWork = nlWorks.length ? Math.min(...nlWorks) : -1;

  const timerColor = timeLeft <= 20 ? "#ef4444" : timeLeft <= 40 ? "#f97316" : "#6b7280";
  const canDeploy = phase === "idle";

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", fontFamily: "var(--font-mono, monospace)", overflow: "hidden" }}>
      {/* Three.js canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }} />

      {/* UI overlay */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", pointerEvents: "none" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "7px 16px", background: "rgba(0,0,0,0.72)", borderBottom: "1px solid #080818", flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: "#252545", letterSpacing: 2 }}>RANGE [{MAX_D}…{SUM}]</span>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: 9, color: "#2a2a4a", marginRight: 6 }}>STORM IN</span>
            <span style={{ fontSize: 18, fontWeight: "bold", color: timerColor }}>{timeLeft}s</span>
            <div style={{ fontSize: 8, color: "#1a1a3a", marginTop: 1 }}>FIND MIN CAPACITY: GUESS A NUMBER. GRID STABLE = TRY LOWER. BLACKOUT = TRY HIGHER.</div>
          </div>
          <span style={{ fontSize: 9, color: "#1e1e3e" }}>{attempts} attempt{attempts !== 1 ? "s" : ""}</span>
        </div>

        {/* District strip */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "6px 0", background: "rgba(0,0,0,0.5)", flexShrink: 0, gap: 2 }}>
          <span style={{ fontSize: 7, color: "#0a0a20", marginRight: 4, letterSpacing: 1 }}>DISTRICTS:</span>
          {DIST.map((d, i) => (
            <div key={i} style={{ width: 48, height: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(6,6,18,0.7)", border: "1px solid #0c0c24" }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#9090c0", lineHeight: 1 }}>{d}</span>
              <span style={{ fontSize: 7, color: "#1a1a40" }}>D{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Number line (appears after 3 attempts) */}
        {showNl && (
          <div style={{ padding: "4px 20px 2px", background: "rgba(0,0,0,0.6)", flexShrink: 0 }}>
            <div style={{ fontSize: 7, color: "#121230", letterSpacing: 2, marginBottom: 3 }}>ANSWER SPACE</div>
            <div style={{ position: "relative", height: 22 }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#111128", transform: "translateY(-50%)" }} />
              {nlMaxFail >= MAX_D && (
                <div style={{ position: "absolute", top: "50%", left: 0, width: toNlPct(nlMaxFail), height: 12, background: "rgba(239,68,68,0.15)", transform: "translateY(-50%)" }} />
              )}
              {nlMinWork <= SUM && (
                <div style={{ position: "absolute", top: "50%", left: toNlPct(nlMinWork), right: 0, height: 12, background: "rgba(34,197,94,0.15)", transform: "translateY(-50%)" }} />
              )}
              {guesses.map((g, i) => (
                <div key={i} style={{ position: "absolute", top: "50%", left: toNlPct(g.cap), width: 8, height: 8, borderRadius: "50%", background: g.ok ? "#22c55e" : "#ef4444", transform: "translate(-50%,-50%)" }} />
              ))}
              <span style={{ position: "absolute", left: 0, bottom: 0, fontSize: 7, color: "#1a1a44", transform: "translateX(0)" }}>{MAX_D}</span>
              <span style={{ position: "absolute", right: 0, bottom: 0, fontSize: 7, color: "#1a1a44" }}>{SUM}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "8px 0 14px", background: "rgba(0,0,0,0.78)", borderTop: "1px solid #080818", flexShrink: 0, pointerEvents: "auto" }}>
          <span style={{ fontSize: 8, color: "#12122e", letterSpacing: 3 }}>MAX LOAD PER TRUCK</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {([[-10, "−10", "#333350"], [-1, "−1", "#555575"]] as const).map(([d, l, c]) => (
              <button key={l} onClick={() => adjCap(d)} disabled={!canDeploy} style={{ fontFamily: "inherit", fontSize: 12, color: c, background: "#0a0a1c", border: "1px solid #14142a", padding: "5px 10px", cursor: canDeploy ? "pointer" : "default", borderRadius: 3 }}>{l}</button>
            ))}
            <div style={{ textAlign: "center", minWidth: 96 }}>
              <span style={{ fontSize: 28, fontWeight: "bold", color: "#a8a8cc" }}>{cap}</span>
              <span style={{ fontSize: 11, color: "#303060" }}> MW</span>
            </div>
            {([[1, "+1", "#555575"], [10, "+10", "#333350"]] as const).map(([d, l, c]) => (
              <button key={l} onClick={() => adjCap(d)} disabled={!canDeploy} style={{ fontFamily: "inherit", fontSize: 12, color: c, background: "#0a0a1c", border: "1px solid #14142a", padding: "5px 10px", cursor: canDeploy ? "pointer" : "default", borderRadius: 3 }}>{l}</button>
            ))}
          </div>
          <button onClick={doDeploy} disabled={!canDeploy} style={{ fontFamily: "inherit", fontSize: 13, letterSpacing: 2, color: canDeploy ? "#b0b0d8" : "#2a2a4a", background: canDeploy ? "#12123a" : "#09091c", border: `1px solid ${canDeploy ? "#20206a" : "#0f0f28"}`, padding: "9px 40px", cursor: canDeploy ? "pointer" : "default", borderRadius: 3, transition: "all 0.15s" }}>
            ▶  DEPLOY
          </button>
        </div>
      </div>

      {/* Feedback message */}
      {msg && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 15 }}>
          <div style={{ textAlign: "center", padding: "18px 28px", background: msg.type === "blackout" ? "rgba(4,0,0,0.88)" : "rgba(0,8,0,0.88)", border: `1px solid ${msg.type === "blackout" ? "#3a0000" : "#003a00"}`, borderRadius: 4, maxWidth: 340 }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: msg.type === "blackout" ? "#dc2626" : "#22c55e", marginBottom: 7 }}>{msg.main}</div>
            <div style={{ fontSize: 11, color: "#374151" }}>{msg.sub}</div>
            {msg.suggest !== undefined && (
              <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 6 }}>Try: {msg.suggest} MW</div>
            )}
          </div>
        </div>
      )}

      {/* Win screen */}
      {phase === "win" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.91)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 25, gap: 7, pointerEvents: "auto" }}>
          <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 4 }}>MINIMUM LOAD FOUND</div>
          <div style={{ fontSize: 54, fontWeight: "bold", color: "#fbbf24", lineHeight: 1 }}>{OPTIMAL}</div>
          <div style={{ fontSize: 14, color: "#2a2a5a" }}>MW per truck</div>
          <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
            {[["Your attempts", String(attempts)], [`BS limit`, `≤${optGuesses} guesses`], ["Time left", `${timeLeft}s`]].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#1e1e44" }}>{k}</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 8, color: "#0e0e2e", marginTop: 4 }}>[{DIST.join(", ")}] K={K}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={() => onRestart()} style={{ fontFamily: "inherit", fontSize: 11, color: "#374151", background: "#0a0a1a", border: "1px solid #1a1a30", padding: "8px 20px", cursor: "pointer", borderRadius: 3 }}>↺ NEW GAME</button>
            <button onClick={() => onSolve()} style={{ fontFamily: "inherit", fontSize: 12, color: "#a855f7", background: "#0d001a", border: "1px solid #3b0764", padding: "9px 28px", cursor: "pointer", borderRadius: 3, letterSpacing: 1 }}>DEBRIEF →</button>
          </div>
        </div>
      )}

      {/* Game over screen */}
      {phase === "over" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 25, gap: 9, pointerEvents: "auto" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#ef4444" }}>STORM HIT</div>
          <div style={{ fontSize: 12, color: "#7f1d1d" }}>GRID COLLAPSED</div>
          <div style={{ fontSize: 11, color: "#374151" }}>Optimal was <span style={{ color: "#fbbf24" }}>{OPTIMAL} MW</span></div>
          <div style={{ fontSize: 10, color: "#1e1e44" }}>Binary search: ≤{optGuesses} guesses from [{MAX_D}…{SUM}]</div>
          <button onClick={() => onRestart()} style={{ fontFamily: "inherit", marginTop: 8, fontSize: 11, color: "#555577", background: "#0c0c1c", border: "1px solid #1a1a30", padding: "9px 24px", cursor: "pointer", borderRadius: 3 }}>↺ TRY AGAIN</button>
        </div>
      )}
    </div>
  );
}

// Outer component: manages restart key so new game regenerates districts
export default function GridZero(props: GameProps) {
  const [key, setKey] = useState(0);
  return <GridZeroGame key={key} {...props} onRestart={() => setKey(k => k + 1)} />;
}
