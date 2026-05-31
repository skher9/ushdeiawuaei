"use client";
// LC #35 — Search Insert Position. Player IS the algorithm.
// Hidden power levels, click to compare, find the insertion slot.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N_FIGHTERS = 12;
const NOISE_PER_WRONG_GAP = 15;

function makeFighters(): number[] {
  const p: number[] = [];
  let cur = 2 + Math.floor(Math.random() * 8);
  for (let i = 0; i < N_FIGHTERS; i++) {
    cur += 3 + Math.floor(Math.random() * 12);
    p.push(cur);
  }
  return p;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function Tournament({ onSolve, onAttempt }: GameProps) {
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

      const FIGHTERS = makeFighters();
      let CHALLENGER: number;
      do {
        CHALLENGER = FIGHTERS[0] + Math.floor(Math.random() * (FIGHTERS[N_FIGHTERS - 1] - FIGHTERS[0]));
      } while (FIGHTERS.includes(CHALLENGER));
      const ANSWER = (() => {
        const i = FIGHTERS.findIndex(f => f >= CHALLENGER);
        return i === -1 ? N_FIGHTERS : i;
      })();

      const HEADER_H = 68;

      class TournamentScene extends Phaser.Scene {
        private left = 0;
        private right = N_FIGHTERS; // insertion range: [0..N_FIGHTERS]
        private noisePct = 0;
        private comparisons: Map<number, "lt" | "gte"> = new Map();
        private busy = false;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private noiseMeter!: Phaser.GameObjects.Graphics;
        private noiseLabel!: Phaser.GameObjects.Text;
        private slotHighlight!: Phaser.GameObjects.Graphics;
        private arrowTween?: Phaser.Tweens.Tween;
        private arrowText?: Phaser.GameObjects.Text;
        private gapReady = false; // true once left === right

        constructor() { super({ key: "TournamentScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#040206");
          this.drawArena();
          this.buildHeader();
          this.buildFighters();
          this.buildFooter();
          this.slotHighlight = this.add.graphics().setDepth(4);
          this.input.on("pointerdown", this.onClick, this);
        }

        drawArena() {
          const g = this.add.graphics();
          g.fillStyle(0x080210, 1);
          g.fillRect(0, H * 0.72, W, H);
          g.lineStyle(1, 0x1a0840, 1);
          g.lineBetween(0, H * 0.72, W, H * 0.72);
          for (let cx = 10; cx < W; cx += 22) {
            const ch = 10 + Math.abs(Math.sin(cx * 0.3)) * 7;
            g.fillStyle(0x0c0420, 1);
            g.fillRect(cx, H * 0.72 - ch, 11, ch);
          }
        }

        buildHeader() {
          const bar = this.add.graphics().setDepth(10);
          bar.fillStyle(0x020104, 1);
          bar.fillRect(0, 0, W, HEADER_H);
          bar.lineStyle(1, 0x1a0840, 1);
          bar.lineBetween(0, HEADER_H, W, HEADER_H);

          // Line 1: title with challenger power
          this.add.text(W / 2, 6, `FIND WHERE CHALLENGER POWER ${CHALLENGER} BELONGS IN THE RANKED LINEUP`, {
            fontFamily: "monospace", fontSize: "10px", color: "#a855f7", fontStyle: "bold",
          }).setOrigin(0.5, 0).setDepth(11);

          // Line 2: mechanics
          this.add.text(W / 2, 26, `${N_FIGHTERS} FIGHTERS RANKED LOW→HIGH  ·  CLICK ANY FIGHTER TO COMPARE  ·  FIND THE RIGHT INSERTION SLOT`, {
            fontFamily: "monospace", fontSize: "8px", color: "#3a1060",
          }).setOrigin(0.5, 0).setDepth(11);

          // Line 3: logic guide
          this.add.text(W / 2, 44, "FIGHTER WEAKER = CHALLENGER GOES AFTER  ·  FIGHTER STRONGER = CHALLENGER GOES BEFORE", {
            fontFamily: "monospace", fontSize: "8px", color: "#221040",
          }).setOrigin(0.5, 0).setDepth(11);

          // Noise meter top right
          this.noiseLabel = this.add.text(W - 12, 8, "NOISE: 0%", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0840",
          }).setOrigin(1, 0).setDepth(11);
          this.noiseMeter = this.add.graphics().setDepth(11);
          this.drawNoiseMeter();
        }

        buildFighters() {
          const pad = 14;
          const totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fw = Math.max(sw - 8, 18);
          const fh = 52;
          const baseY = HEADER_H + (H * 0.72 - HEADER_H) * 0.55;

          for (let i = 0; i < N_FIGHTERS; i++) {
            const cx = pad + i * sw + sw / 2;
            const c = this.add.container(cx, baseY);

            const body = this.add.graphics();
            body.fillStyle(0x180830, 1);
            body.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
            body.lineStyle(1, 0x3a1060, 1);
            body.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);

            const icon = this.add.text(0, -8, "◈", {
              fontFamily: "monospace", fontSize: "13px", color: "#6a30a0",
            }).setOrigin(0.5).setName("icon");

            // Power shown as ??? until compared
            const pow = this.add.text(0, 13, "???", {
              fontFamily: "monospace", fontSize: "8px", color: "#2a1050",
            }).setOrigin(0.5).setName("pow");

            c.add([body, icon, pow]);
            c.setData("idx", i);
            c.setSize(sw - 4, fh + 10);
            c.setInteractive({ cursor: "pointer" });
          }
        }

        buildFooter() {
          this.statusText = this.add.text(W / 2, H - 32, "CLICK A FIGHTER TO COMPARE POWER", {
            fontFamily: "monospace", fontSize: "10px", color: "#2a1050",
          }).setOrigin(0.5).setDepth(11);

          this.rangeText = this.add.text(W / 2, H - 16, `INSERTION RANGE: [${this.left}, ${this.right}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0840",
          }).setOrigin(0.5).setDepth(11);
        }

        drawNoiseMeter() {
          this.noiseMeter.clear();
          const bw = 70, bh = 4;
          const bx = W - 90, by = 30;
          this.noiseMeter.fillStyle(0x111111, 1);
          this.noiseMeter.fillRect(bx, by, bw, bh);
          if (this.noisePct > 0) {
            const col = this.noisePct >= 80 ? 0xef4444 : this.noisePct >= 50 ? 0xeab308 : 0xa855f7;
            this.noiseMeter.fillStyle(col, 1);
            this.noiseMeter.fillRect(bx, by, bw * (this.noisePct / 100), bh);
          }
        }

        addNoise(pct: number) {
          this.noisePct = Math.min(100, this.noisePct + pct);
          this.noiseLabel.setText(`NOISE: ${Math.round(this.noisePct)}%`).setStyle({
            color: this.noisePct >= 80 ? "#ef4444" : this.noisePct >= 50 ? "#eab308" : "#1a0840",
          });
          this.drawNoiseMeter();

          if (this.noisePct >= 100) {
            this.time.delayedCall(400, () => this.showRetry());
          }
        }

        getFighterContainer(i: number): Phaser.GameObjects.Container | undefined {
          return this.children.list.find(obj => {
            if (!(obj instanceof Phaser.GameObjects.Container)) return false;
            return obj.getData("idx") === i;
          }) as Phaser.GameObjects.Container | undefined;
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 14;
          const totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fh = 62;
          const baseY = HEADER_H + (H * 0.72 - HEADER_H) * 0.55;

          // Gap click zones — thin strips between fighters
          // Only active when gapReady (left === right)
          if (this.gapReady) {
            const gapHitW = sw * 0.45;
            for (let g = 0; g <= N_FIGHTERS; g++) {
              let gx: number;
              if (g === 0) gx = pad;
              else if (g === N_FIGHTERS) gx = W - pad;
              else gx = pad + g * sw;

              if (Math.abs(pointer.x - gx) < gapHitW && pointer.y > HEADER_H && pointer.y < H * 0.72) {
                this.tryInsert(g, pointer.x, pointer.y);
                return;
              }
            }
          }

          // Fighter click — only within current [left, right-1] range
          for (let i = 0; i < N_FIGHTERS; i++) {
            if (i < this.left || i > this.right - 1) continue; // right is exclusive for gaps
            if (this.comparisons.has(i)) continue; // already compared, skip
            const cx = pad + i * sw + sw / 2;
            if (Math.abs(pointer.x - cx) < sw / 2 && Math.abs(pointer.y - baseY) < fh / 2) {
              this.compareFighter(i, pointer.x, pointer.y);
              return;
            }
          }

          // Also allow clicking already-compared fighters for re-read (no action, just info)
          // Actually don't — keep it simple, just ignore
        }

        compareFighter(i: number, px: number, py: number) {
          this.busy = true;
          onAttempt();
          playSound("click");
          emitToolUsed("Binary Search", "O(log n)");

          const isGte = FIGHTERS[i] >= CHALLENGER; // fighter stronger or equal → challenger goes before
          this.comparisons.set(i, isGte ? "gte" : "lt");

          if (isGte) {
            this.right = i; // challenger goes before fighter[i], so right boundary narrows
          } else {
            this.left = i + 1; // challenger goes after fighter[i], so left boundary narrows
          }

          this.updateFighterDisplay(i, isGte);
          this.dimFighters();
          this.rangeText.setText(`INSERTION RANGE: [${this.left}, ${this.right}]`);

          const hint = isGte
            ? `FIGHTER [${i}]=${FIGHTERS[i]} ≥ ${CHALLENGER} — CHALLENGER GOES BEFORE  ·  RANGE [${this.left}..${this.right}]`
            : `FIGHTER [${i}]=${FIGHTERS[i]} < ${CHALLENGER} — CHALLENGER GOES AFTER  ·  RANGE [${this.left}..${this.right}]`;
          this.statusText.setText(hint).setStyle({ color: isGte ? "#9060c0" : "#c07020" });
          emitReaction(isGte ? "SLIDE_LEFT" : "SLIDE_RIGHT", isGte ? "← GOES BEFORE" : "GOES AFTER →", px, py);
          playSound("beep");

          if (this.left === this.right) {
            this.gapReady = true;
            this.showInsertSlot(this.left);
            this.statusText.setText(`FOUND SLOT ${this.left} — CLICK THE GLOWING GAP TO INSERT`).setStyle({ color: "#a855f7" });
          }

          this.busy = false;
        }

        updateFighterDisplay(i: number, isGte: boolean) {
          const pad = 14;
          const totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fw = Math.max(sw - 8, 18);
          const fh = 52;

          const c = this.getFighterContainer(i);
          if (!c) return;

          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(isGte ? 0x1a0830 : 0x2a1400, 1);
          bg.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);
          bg.lineStyle(1, isGte ? 0x9030c0 : 0xc06000, 1);
          bg.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 4);

          const pow = c.getByName("pow") as Phaser.GameObjects.Text;
          pow.setText(String(FIGHTERS[i])).setStyle({ color: isGte ? "#9030c0" : "#c07020" });
        }

        dimFighters() {
          const pad = 14;
          const totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;
          const fw = Math.max(sw - 8, 18);
          const fh = 52;

          for (let i = 0; i < N_FIGHTERS; i++) {
            const c = this.getFighterContainer(i);
            if (!c) continue;
            // Dim fighters outside [left, right-1] that haven't been compared yet
            const inRange = i >= this.left && i <= this.right - 1;
            if (this.comparisons.has(i)) {
              // Already compared — keep visible but slightly dimmed if out of range
              c.setAlpha(inRange ? 1 : 0.4);
            } else {
              c.setAlpha(inRange ? 1 : 0.3);
              if (inRange) {
                c.setInteractive({ cursor: "pointer" });
              } else {
                c.disableInteractive();
              }
            }
          }
        }

        showInsertSlot(slot: number) {
          const pad = 14;
          const totalW = W - pad * 2;
          const sw = totalW / N_FIGHTERS;

          let gx: number;
          if (slot === 0) gx = pad;
          else if (slot === N_FIGHTERS) gx = W - pad;
          else gx = pad + slot * sw;

          this.slotHighlight.clear();
          this.slotHighlight.lineStyle(2, 0xa855f7, 0.9);
          this.slotHighlight.lineBetween(gx, HEADER_H + 8, gx, H * 0.72 - 4);

          // Pulsing arrow
          if (this.arrowText) {
            this.arrowText.destroy();
            this.arrowTween?.stop();
          }
          this.arrowText = this.add.text(gx, HEADER_H + 20, "▼", {
            fontFamily: "monospace", fontSize: "16px", color: "#a855f7",
          }).setOrigin(0.5, 0).setDepth(6);
          this.arrowTween = this.tweens.add({
            targets: this.arrowText, alpha: 0.2, duration: 420, yoyo: true, repeat: -1,
          });
        }

        tryInsert(slot: number, px: number, py: number) {
          onAttempt();
          if (slot === ANSWER) {
            solvedRef.current = true;
            playSound("solve");
            this.statusText.setText(`CHALLENGER INSERTED AT SLOT [${slot}] — TOURNAMENT BEGINS`).setStyle({ color: "#a855f7" });
            emitReaction("BURST", "⚔ PERFECT SLOT", px, py);
            this.arrowTween?.stop();
            if (this.arrowText) {
              this.arrowText.setStyle({ color: "#ff88ff" });
            }
            this.time.delayedCall(600, () => onSolve());
          } else {
            this.addNoise(NOISE_PER_WRONG_GAP);
            playSound("wrong");
            emitReaction("DANGER", "✗ WRONG SLOT", px, py);
            this.statusText.setText(`WRONG SLOT — CROWD RIOTS  ·  CORRECT SLOT IS [${ANSWER}]  ·  RANGE [${this.left}..${this.right}]`).setStyle({ color: "#cc2244" });
          }
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.78);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 28, "CROWD RIOT — TOURNAMENT CANCELLED", {
            fontFamily: "monospace", fontSize: "11px", color: "#cc2244",
          }).setOrigin(0.5).setDepth(21);

          this.add.text(W / 2, H / 2 - 8, "Each wrong gap insertion adds 15% noise — narrow the range before clicking a gap", {
            fontFamily: "monospace", fontSize: "8px", color: "#441122",
          }).setOrigin(0.5).setDepth(21);

          this.add.text(W / 2, H / 2 + 8, "Binary search narrows range to 1 in ≤4 comparisons, then the slot is guaranteed", {
            fontFamily: "monospace", fontSize: "8px", color: "#2a0a18",
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 34, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#a855f7",
            backgroundColor: "#040206", padding: { x: 16, y: 7 },
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
        parent: containerRef.current!, backgroundColor: "#040206",
        scene: TournamentScene, render: { antialias: true },
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
