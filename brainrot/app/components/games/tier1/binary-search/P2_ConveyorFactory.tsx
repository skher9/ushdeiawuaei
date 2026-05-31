"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "./types";

const N = 12;
const TARGET = 2 + Math.floor(Math.random() * (N - 3));

export default function P2_ConveyorFactory({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    left: 0,
    right: N - 1,
    charges: 5,
    solved: false,
    phase: "idle" as "idle" | "scanning" | "done",
    scanIdx: -1,
    eliminated: new Set<number>(),
    message: "CLICK A BOX TO SCAN",
  });
  const rafRef = useRef<number>(0);

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

    const slotW = Math.floor((W - 40) / N);
    const slotH = 60;
    const shelfY = H / 2 - slotH / 2;

    function getBoxRect(i: number) {
      return { x: 20 + i * slotW, y: shelfY, w: slotW - 4, h: slotH };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      // Conveyor belt line
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, shelfY + slotH + 8);
      ctx.lineTo(W - 20, shelfY + slotH + 8);
      ctx.stroke();

      for (let i = 0; i < N; i++) {
        const { x, y, w, h } = getBoxRect(i);
        const isElim = state.eliminated.has(i);
        const isMid = i === state.scanIdx;
        const isTarget = i === TARGET;

        if (isElim) {
          ctx.globalAlpha = 0.15;
        }

        ctx.fillStyle = isTarget && state.solved ? "#0d2a0d" : isMid ? "#1a2a1a" : "#111";
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();

        ctx.strokeStyle = isTarget && state.solved ? "#22c55e" : isMid ? "#22c55e" : "#1e1e1e";
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, w, h, 4);
        ctx.stroke();

        ctx.globalAlpha = 1;

        // Box label
        ctx.fillStyle = isElim ? "#1e1e1e" : "#475569";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x + w / 2, y + h / 2);
      }

      // UV scanner beam during scan
      if (state.phase === "scanning" && state.scanIdx >= 0) {
        const { x, y, w } = getBoxRect(state.scanIdx);
        ctx.strokeStyle = "rgba(34,197,94,0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y - 20);
        ctx.lineTo(x + w / 2, y + slotH + 20);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Charge indicators
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < state.charges ? "#22c55e" : "#1a1a1a";
        ctx.beginPath();
        ctx.arc(20 + i * 14, 20, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Message
      ctx.fillStyle = state.solved ? "#22c55e" : "#374151";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(state.message, W / 2, H - 20);

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    function handleClick(e: MouseEvent) {
      if (state.solved || state.phase === "scanning") return;
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (let i = state.left; i <= state.right; i++) {
        if (state.eliminated.has(i)) continue;
        const { x, y, w, h } = getBoxRect(i);
        if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
          scan(i);
          return;
        }
      }
    }

    function scan(clicked: number) {
      if (state.charges <= 0) return;
      state.charges--;
      onAttempt();

      const mid = clicked;
      state.scanIdx = mid;
      state.phase = "scanning";
      state.message = `scanning box ${mid + 1}...`;

      setTimeout(() => {
        if (mid === TARGET) {
          state.solved = true;
          state.phase = "done";
          state.message = "contamination found";
          setTimeout(() => onSolve(), 600);
        } else {
          const contaminated = TARGET > mid;
          const toElim = contaminated
            ? Array.from({ length: mid - state.left + 1 }, (_, k) => state.left + k)
            : Array.from({ length: state.right - mid + 1 }, (_, k) => mid + k);
          for (const i of toElim) state.eliminated.add(i);
          if (contaminated) state.left = mid + 1;
          else state.right = mid - 1;
          state.scanIdx = -1;
          state.phase = "idle";
          const remaining = state.right - state.left + 1;
          state.message = contaminated
            ? `clean. contamination is HIGHER. ${state.charges} charges left.`
            : `clean. contamination is LOWER. ${state.charges} charges left.`;
        }
      }, 700);
    }

    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("click", handleClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
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
