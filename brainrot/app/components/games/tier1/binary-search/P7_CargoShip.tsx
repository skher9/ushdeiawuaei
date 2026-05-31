"use client";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";

// Package weights
const WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAYS = 5;

const MAX_CAP = WEIGHTS.reduce((a, b) => a + b, 0); // 36
const MIN_CAP = Math.max(...WEIGHTS);                // 8
const RANGE = MAX_CAP - MIN_CAP + 1;                 // 29

function minCapacity(weights: number[], D: number): number {
  const lo = Math.max(...weights);
  const hi = weights.reduce((a, b) => a + b, 0);
  for (let c = lo; c <= hi; c++) {
    let days = 1, cur = 0;
    for (const w of weights) {
      if (cur + w > c) { days++; cur = 0; }
      cur += w;
    }
    if (days <= D) return c;
  }
  return hi;
}

function daysFor(cap: number): number {
  let days = 1, cur = 0;
  for (const w of WEIGHTS) {
    if (cur + w > cap) { days++; cur = 0; }
    cur += w;
  }
  return days;
}

const ANSWER = minCapacity(WEIGHTS, DAYS);

export default function P7_CargoShip({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attempts, setAttempts] = useState(0);
  const [statusMsg, setStatusMsg] = useState("CLICK ANY CAPACITY TO BEGIN");

  const stateRef = useRef({
    left: MIN_CAP,
    right: MAX_CAP,
    solved: false,
    busy: false,
    // revealed[i] = { days, canDo } once clicked, else null
    revealed: new Array<{ days: number; canDo: boolean } | null>(RANGE).fill(null),
    // eliminated set — bars that should be dimmed
    eliminated: new Set<number>(),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    const state = stateRef.current;

    const BAR_H = 80;
    const barW = Math.floor((W - 60) / RANGE);
    const baseY = H / 2 + 60;

    function getBarX(cap: number) {
      return 30 + (cap - MIN_CAP) * barW + barW / 2;
    }

    let rafId: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      for (let cap = MIN_CAP; cap <= MAX_CAP; cap++) {
        const idx = cap - MIN_CAP;
        const x = getBarX(cap);
        const isElim = state.eliminated.has(cap);
        const rev = state.revealed[idx];

        ctx.globalAlpha = isElim && !rev ? 0.2 : 1;

        if (rev) {
          // Revealed bar — colored
          const fillColor = rev.canDo ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)";
          const strokeColor = rev.canDo ? "#22c55e" : "#ef4444";
          ctx.fillStyle = fillColor;
          roundRect(ctx, x - barW / 2 + 1, baseY - BAR_H, barW - 2, BAR_H, 3);
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          roundRect(ctx, x - barW / 2 + 1, baseY - BAR_H, barW - 2, BAR_H, 3);
          ctx.stroke();
          // Days label above bar
          ctx.fillStyle = rev.canDo ? "#22c55e" : "#ef4444";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${rev.days}d`, x, baseY - BAR_H - 4);
        } else {
          // Locked bar — uniform height, question mark
          ctx.fillStyle = "#1a1a2e";
          roundRect(ctx, x - barW / 2 + 1, baseY - BAR_H, barW - 2, BAR_H, 3);
          ctx.fill();
          ctx.strokeStyle = "#2a2a3e";
          ctx.lineWidth = 1;
          roundRect(ctx, x - barW / 2 + 1, baseY - BAR_H, barW - 2, BAR_H, 3);
          ctx.stroke();
          // Question mark in center
          if (!isElim) {
            ctx.fillStyle = "#374151";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText("?", x, baseY - BAR_H / 2 + 4);
          }
        }

        ctx.globalAlpha = 1;

        // Capacity label below bar
        ctx.fillStyle = isElim && !rev ? "#1a1a1a" : "#374151";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`c${cap}`, x, baseY + 14);
      }

      rafId = requestAnimationFrame(draw);
    }

    draw();

    canvas.addEventListener("click", (e) => {
      if (state.solved || state.busy) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const cap = Math.floor((mx - 30) / barW) + MIN_CAP;
      if (cap < MIN_CAP || cap > MAX_CAP) return;
      // Don't click eliminated (non-revealed) bars
      if (state.eliminated.has(cap) && !state.revealed[cap - MIN_CAP]) return;

      state.busy = true;
      onAttempt();
      setAttempts(a => a + 1);

      const days = daysFor(cap);
      const canDo = days <= DAYS;
      state.revealed[cap - MIN_CAP] = { days, canDo };

      const direction = canDo ? "WORKS, TRY LESS" : "NOT ENOUGH, NEED MORE";
      setStatusMsg(`CAP ${cap}: ${days}d — ${direction}`);

      setTimeout(() => {
        if (canDo) {
          // Check minimum: left neighbor doesn't work
          if (cap === state.left || daysFor(cap - 1) > DAYS) {
            state.solved = true;
            setStatusMsg(`MINIMUM CAPACITY: ${cap}`);
            setTimeout(() => onSolve(), 700);
          } else {
            state.right = cap;
            for (let c = cap + 1; c <= MAX_CAP; c++) state.eliminated.add(c);
          }
        } else {
          state.left = cap + 1;
          for (let c = MIN_CAP; c <= cap; c++) state.eliminated.add(c);
        }
        state.busy = false;
      }, 400);
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Instruction header — plain HTML */}
      <div style={{
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#475569",
        background: "#0a0a0a",
        padding: "8px 12px",
        borderBottom: "1px solid #1e1e1e",
        lineHeight: "1.6",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#94a3b8", fontWeight: "bold" }}>// CARGO SHIP</span>
          <span>ATTEMPTS: {attempts}</span>
        </div>
        <div>FIND MIN CAPACITY: SHIP [{WEIGHTS.join(",")}] IN {DAYS} DAYS?</div>
        <div>CLICK ANY CAPACITY → REVEALS DAYS NEEDED → <span style={{ color: "#22c55e" }}>GREEN=WORKS</span> / <span style={{ color: "#ef4444" }}>RED=NOT ENOUGH</span></div>
        <div>NOT ENOUGH = NEED MORE CAPACITY (go right) &nbsp;·&nbsp; WORKS = TRY LESS (go left)</div>
        <div style={{ marginTop: "4px", color: stateRef.current.solved ? "#22c55e" : "#374151" }}>{statusMsg}</div>
      </div>
      {/* Canvas fills remaining space */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: "pointer" }} />
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
