"use client";
// LC #162 — Find Peak Element. 14 mountains, 5 power cells.
// Click any mountain: costs 1 cell, reveals exact height + slope direction.
// Binary search the peak using slope: go toward ascending side.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 14;
const MAX_CELLS = 5;

function makePeakHeights(): number[] {
  const h: number[] = new Array(N).fill(0);
  const peakIdx = 2 + Math.floor(Math.random() * (N - 4));
  for (let i = 0; i <= peakIdx; i++) {
    h[i] = Math.floor((i / peakIdx) * 80) + 20 + Math.floor(Math.random() * 15);
  }
  for (let i = peakIdx + 1; i < N; i++) {
    const descent = (i - peakIdx) / (N - peakIdx);
    h[i] = Math.floor(h[peakIdx] * (1 - descent)) + 10 + Math.floor(Math.random() * 12);
  }
  h[peakIdx] = Math.max(h[peakIdx], 95 + Math.floor(Math.random() * 10));
  return h;
}

function isPeak(h: number[], i: number): boolean {
  const leftOk = i === 0 || h[i] > h[i - 1];
  const rightOk = i === N - 1 || h[i] > h[i + 1];
  return leftOk && rightOk;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function DeadSignal({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: () => void } | null>(null);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      const HEIGHTS = makePeakHeights();

      class DeadSignalScene extends Phaser.Scene {
        private mountains: Phaser.GameObjects.Container[] = [];
        private cellsLeft = MAX_CELLS;
        private cellText!: Phaser.GameObjects.Text;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private busy = false;
        private left = 0;
        private right = N - 1;
        private probed: Set<number> = new Set();

        constructor() { super({ key: "DeadSignalScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#030608");
          this.drawSky();
          this.buildMountains();
          this.buildHUD();
          this.input.on("pointerdown", this.onClick, this);
        }

        drawSky() {
          const g = this.add.graphics();
          for (let i = 0; i < 10; i++) {
            g.fillStyle(0x001122, 0.03 + i * 0.02);
            g.fillRect(0, 0, W, H * 0.6);
          }
          g.lineStyle(1, 0x0a2040, 0.5);
          g.lineBetween(0, H * 0.62, W, H * 0.62);
          for (let s = 0; s < 60; s++) {
            g.fillStyle(0xaaaacc, 0.3 + Math.random() * 0.6);
            g.fillCircle(Math.random() * W, Math.random() * H * 0.55, 0.7);
          }
        }

        buildMountains() {
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.78;
          const maxMH = H * 0.38;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            const hw = Math.max(mw * 0.38, 10);
            const container = this.add.container(cx, groundY);

            const body = this.add.graphics();
            body.fillStyle(0x0a1828, 1);
            body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
            body.lineStyle(1, 0x1a3050, 1);
            body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

            const heightLabel = this.add.text(0, -mh - 14, "", {
              fontFamily: "monospace", fontSize: "8px", color: "#0a2040",
            }).setOrigin(0.5).setName("hlabel");

            const slopeLabel = this.add.text(0, -mh - 24, "", {
              fontFamily: "monospace", fontSize: "9px", color: "#4a8aaa",
            }).setOrigin(0.5).setName("slabel");

            const ring = this.add.graphics().setName("ring").setVisible(false);

            const idxLabel = this.add.text(0, 8, String(i), {
              fontFamily: "monospace", fontSize: "7px", color: "#0a1828",
            }).setOrigin(0.5);

            container.add([body, ring, heightLabel, slopeLabel, idxLabel]);
            container.setSize(mw - 2, mh + 20);
            container.setInteractive({ cursor: "pointer" });
            container.setData("index", i);
            this.mountains.push(container);

            container.on("pointerover", () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0e2038, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x2a5080, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
            container.on("pointerout", () => {
              if (this.busy || this.probed.has(i)) return;
              const b = container.list[0] as Phaser.GameObjects.Graphics;
              b.clear();
              b.fillStyle(0x0a1828, 1);
              b.fillTriangle(-hw, 0, hw, 0, 0, -mh);
              b.lineStyle(1, 0x1a3050, 1);
              b.strokeTriangle(-hw, 0, hw, 0, 0, -mh);
            });
          }

          const gnd = this.add.graphics();
          gnd.fillStyle(0x050e18, 1);
          gnd.fillRect(0, groundY, W, H - groundY);
          gnd.lineStyle(1, 0x0a2030, 1);
          gnd.lineBetween(0, groundY, W, groundY);
        }

        buildHUD() {
          // Top instruction bar — 68px tall
          const bar = this.add.graphics();
          bar.fillStyle(0x020406, 1);
          bar.fillRect(0, 0, W, 68);
          bar.lineStyle(1, 0x0a2040, 1);
          bar.lineBetween(0, 68, W, 68);

          // Line 1: game name + primary instruction
          this.add.text(W / 2, 8, "FIND THE PEAK — SIGNAL STRONGER THAN BOTH NEIGHBORS", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a4060",
          }).setOrigin(0.5, 0);

          // Line 2: mountains + probe hint
          this.add.text(W / 2, 24, `${N} MOUNTAINS · HEIGHTS HIDDEN · CLICK ANY MOUNTAIN TO PROBE (COSTS 1 CELL)`, {
            fontFamily: "monospace", fontSize: "8px", color: "#0c1e2e",
          }).setOrigin(0.5, 0);

          // Line 3: slope reading tip
          this.add.text(W / 2, 40, "AFTER PROBE: IF RIGHT NEIGHBOR IS STRONGER → PEAK IS RIGHT  ·  IF LEFT IS STRONGER → PEAK IS LEFT", {
            fontFamily: "monospace", fontSize: "7px", color: "#091520",
          }).setOrigin(0.5, 0);

          // Game label top-left
          this.add.text(8, 8, "// DEAD SIGNAL", {
            fontFamily: "monospace", fontSize: "8px", color: "#061018",
          });

          // Cell counter top-right
          this.cellText = this.add.text(W - 10, 8, `CELLS: ${MAX_CELLS}`, {
            fontFamily: "monospace", fontSize: "10px", color: "#22c55e",
          }).setOrigin(1, 0);

          // Status bar at bottom
          this.statusText = this.add.text(W / 2, H - 36, "PROBE THE MIDPOINT FIRST", {
            fontFamily: "monospace", fontSize: "10px", color: "#0a2040",
          }).setOrigin(0.5);

          this.rangeText = this.add.text(W / 2, H - 20, `SEARCH: [${this.left}..${this.right}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#061828",
          }).setOrigin(0.5);
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const groundY = H * 0.78;
          const maxMH = H * 0.38;

          for (let i = 0; i < N; i++) {
            const cx = pad + i * mw + mw / 2;
            const mh = (HEIGHTS[i] / 110) * maxMH;
            if (Math.abs(pointer.x - cx) < mw / 2 && pointer.y > groundY - mh - 15 && pointer.y < groundY + 10) {
              this.doProbe(i, pointer.x, pointer.y);
              return;
            }
          }
        }

        spendCells(n: number): boolean {
          if (this.cellsLeft < n) {
            this.statusText.setText(`NOT ENOUGH CELLS — need ${n}, have ${this.cellsLeft}`).setStyle({ color: "#ef4444" });
            return false;
          }
          this.cellsLeft -= n;
          this.cellText.setText(`CELLS: ${this.cellsLeft}`).setStyle({
            color: this.cellsLeft <= 1 ? "#ef4444" : this.cellsLeft <= 2 ? "#eab308" : "#22c55e",
          });
          return true;
        }

        doProbe(i: number, px: number, py: number) {
          if (this.probed.has(i)) return;
          if (!this.spendCells(1)) return;
          this.busy = true;
          onAttempt();
          emitToolUsed("Binary Search", "O(log n)");
          playSound("beep");

          this.probed.add(i);
          const peak = isPeak(HEIGHTS, i);
          this.revealMountain(i, peak);

          const leftStr = i > 0 ? (HEIGHTS[i] > HEIGHTS[i - 1] ? "↑" : "↓") : "⊣";
          const rightStr = i < N - 1 ? (HEIGHTS[i] > HEIGHTS[i + 1] ? "↑" : "↓") : "⊢";

          if (peak) {
            this.onPeakFound(i, px, py);
          } else {
            const goRight = i < N - 1 && HEIGHTS[i + 1] > HEIGHTS[i];
            if (goRight) this.left = i + 1; else this.right = i;
            this.statusText
              .setText(`[${i}]:${HEIGHTS[i]}  L${leftStr} R${rightStr} — go ${goRight ? "RIGHT ▶" : "◀ LEFT"}`)
              .setStyle({ color: "#4a8aaa" });
            this.rangeText.setText(`SEARCH: [${this.left}..${this.right}]`);
            emitReaction(goRight ? "SLIDE_RIGHT" : "SLIDE_LEFT", goRight ? "→ STRONGER" : "← STRONGER", px, py);
            playSound("correct");
            if (this.cellsLeft <= 0) {
              this.time.delayedCall(400, () => this.showRetry());
            } else {
              this.busy = false;
            }
          }
        }

        revealMountain(i: number, peak: boolean) {
          const pad = 20;
          const mw = Math.floor((W - pad * 2) / N);
          const maxMH = H * 0.38;
          const mh = (HEIGHTS[i] / 110) * maxMH;
          const hw = Math.max(mw * 0.38, 10);
          const container = this.mountains[i];

          const body = container.list[0] as Phaser.GameObjects.Graphics;
          body.clear();
          body.fillStyle(peak ? 0x001a10 : 0x0a1828, 1);
          body.fillTriangle(-hw, 0, hw, 0, 0, -mh);
          body.lineStyle(peak ? 2 : 1, peak ? 0x22c55e : 0x3a5080, 1);
          body.strokeTriangle(-hw, 0, hw, 0, 0, -mh);

          const ring = container.getByName("ring") as Phaser.GameObjects.Graphics;
          ring.setVisible(true);
          ring.lineStyle(1, peak ? 0x22c55e : 0x3a6090, 0.6);
          ring.strokeCircle(0, -mh, 12);

          // Height number above mountain
          const hlabel = container.getByName("hlabel") as Phaser.GameObjects.Text;
          hlabel.setText(String(HEIGHTS[i])).setStyle({ color: peak ? "#22c55e" : "#4a8aaa", fontSize: "9px" });

          // Slope arrows: left neighbor direction | right neighbor direction
          const leftArrow = i > 0 ? (HEIGHTS[i] > HEIGHTS[i - 1] ? "↑" : "↓") : "";
          const rightArrow = i < N - 1 ? (HEIGHTS[i] > HEIGHTS[i + 1] ? "↑" : "↓") : "";
          const slopeStr = peak ? "PEAK" : `${leftArrow} ${rightArrow}`;
          const slabel = container.getByName("slabel") as Phaser.GameObjects.Text;
          slabel.setText(slopeStr).setStyle({ color: peak ? "#22c55e" : "#2a6080", fontSize: "9px" });
        }

        onPeakFound(i: number, px: number, py: number) {
          solvedRef.current = true;
          playSound("solve");
          this.statusText.setText(`PEAK SIGNAL AT [${i}] — STRENGTH ${HEIGHTS[i]}`).setStyle({ color: "#22c55e" });
          emitReaction("BURST", "📡 PEAK FOUND", px, py);

          this.tweens.add({
            targets: this.mountains[i],
            scaleX: 1.15, scaleY: 1.15,
            duration: 250, yoyo: true, repeat: 1,
            onComplete: () => this.time.delayedCall(600, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 24, "POWER CELLS DEPLETED", {
            fontFamily: "monospace", fontSize: "12px", color: "#4a8aaa",
          }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 - 6, "Probe the midpoint each time — binary search finds peak in ≤4 probes", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a3a5a",
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 20, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#3b82f6",
            backgroundColor: "#030608", padding: { x: 18, y: 8 },
          }).setOrigin(0.5).setDepth(21).setInteractive({ cursor: "pointer" });

          btn.on("pointerdown", () => {
            solvedRef.current = false;
            this.scene.restart();
          });
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#030608",
        scene: DeadSignalScene, render: { antialias: true },
      });
      gameRef.current = { destroy: () => g.destroy(true) };
    }

    init();
    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "crosshair" }} />;
}
