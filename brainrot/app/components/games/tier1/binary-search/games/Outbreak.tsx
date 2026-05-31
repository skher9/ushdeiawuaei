"use client";
// LC #278 — First Bad Version. Player IS the algorithm.
// Hidden chambers, click to reveal. Ooze timer forces binary search efficiency.
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 20;
const OOZE_SECONDS = 45;
const COST_PER_TEST = 2.5;

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

function randFirstInfected() {
  return 2 + Math.floor(Math.random() * 16); // index 2..17
}

export default function Outbreak({ onSolve, onAttempt }: GameProps) {
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
      const FIRST_INFECTED = randFirstInfected();

      const HEADER_H = 68;

      class OutbreakScene extends Phaser.Scene {
        private chambers: Phaser.GameObjects.Container[] = [];
        private revealed: Map<number, boolean> = new Map();
        private left = 0;
        private right = N - 1;
        private busy = false;
        private oozeRemaining = OOZE_SECONDS;
        private oozeGraphic!: Phaser.GameObjects.Graphics;
        private oozeBar!: Phaser.GameObjects.Graphics;
        private oozeTimer?: Phaser.Time.TimerEvent;
        private statusText!: Phaser.GameObjects.Text;
        private rangeText!: Phaser.GameObjects.Text;
        private testsText!: Phaser.GameObjects.Text;
        private testsCount = 0;

        constructor() { super({ key: "OutbreakScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#050409");
          this.drawBg();
          this.buildHeader();
          this.buildChambers();
          this.buildFooter();
          this.startOozeTimer();
          this.input.on("pointerdown", this.onClick, this);
        }

        drawBg() {
          const g = this.add.graphics();
          g.lineStyle(1, 0x080210, 1);
          for (let x = 0; x < W; x += 50) g.lineBetween(x, 0, x, H);
          for (let y = 0; y < H; y += 50) g.lineBetween(0, y, W, y);
        }

        buildHeader() {
          // Header bar
          const bar = this.add.graphics().setDepth(10);
          bar.fillStyle(0x020204, 1);
          bar.fillRect(0, 0, W, HEADER_H);
          bar.lineStyle(1, 0x140a28, 1);
          bar.lineBetween(0, HEADER_H, W, HEADER_H);

          // Line 1: title
          this.add.text(W / 2, 8, "FIND PATIENT ZERO — THE FIRST INFECTED CHAMBER", {
            fontFamily: "monospace", fontSize: "11px", color: "#cc0033", fontStyle: "bold",
          }).setOrigin(0.5, 0).setDepth(11);

          // Line 2: mechanics
          this.add.text(W / 2, 27, `${N} CHAMBERS  ·  INFECTION SPREADS RIGHT FROM PATIENT ZERO  ·  CLICK ANY CHAMBER TO TEST`, {
            fontFamily: "monospace", fontSize: "8px", color: "#441122",
          }).setOrigin(0.5, 0).setDepth(11);

          // Line 3: logic guide
          this.add.text(W / 2, 45, "INFECTED = PATIENT ZERO IS HERE OR TO THE LEFT  ·  CLEAN = PATIENT ZERO IS TO THE RIGHT", {
            fontFamily: "monospace", fontSize: "8px", color: "#2a0a18",
          }).setOrigin(0.5, 0).setDepth(11);

          // Tests counter top right
          this.testsText = this.add.text(W - 12, 10, "TESTS: 0", {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0830",
          }).setOrigin(1, 0).setDepth(11);
        }

        buildChambers() {
          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const baseY = HEADER_H + (H - HEADER_H - 50) * 0.5;

          for (let i = 0; i < N; i++) {
            const x = pad + i * bw + bw / 2;
            const c = this.add.container(x, baseY);

            const bg = this.add.graphics();
            bg.fillStyle(0x0c0c18, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x1a1a40, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);

            const num = this.add.text(0, bh / 2 - 8, String(i), {
              fontFamily: "monospace", fontSize: "7px", color: "#1a1a3a",
            }).setOrigin(0.5);

            const icon = this.add.text(0, -4, "🔒", {
              fontFamily: "monospace", fontSize: "11px",
            }).setOrigin(0.5).setName("icon");

            c.add([bg, num, icon]);
            c.setSize(bw - 2, bh);
            c.setInteractive({ cursor: "pointer" });
            c.setData("index", i);
            this.chambers.push(c);
          }
        }

        buildFooter() {
          // Ooze bar at bottom
          this.oozeBar = this.add.graphics().setDepth(2);
          this.oozeGraphic = this.add.graphics().setDepth(5);

          this.statusText = this.add.text(W / 2, H - 32, "CLICK A CHAMBER TO TEST IT", {
            fontFamily: "monospace", fontSize: "10px", color: "#2a1050",
          }).setOrigin(0.5).setDepth(11);

          this.rangeText = this.add.text(W / 2, H - 16, `SEARCH RANGE: [0, ${N - 1}]`, {
            fontFamily: "monospace", fontSize: "9px", color: "#1a0830",
          }).setOrigin(0.5).setDepth(11);
        }

        startOozeTimer() {
          this.drawOoze();
          this.oozeTimer = this.time.addEvent({
            delay: 100, loop: true,
            callback: () => {
              if (solvedRef.current) return;
              this.oozeRemaining -= 0.1;
              this.drawOoze();
              if (this.oozeRemaining <= 0) {
                this.oozeTimer?.remove();
                this.statusText.setText("OOZE REACHED YOU — RETRY").setStyle({ color: "#cc0066" });
                playSound("alarm");
                this.showRetry();
              }
            },
          });
        }

        drawOoze() {
          const pct = Math.max(0, this.oozeRemaining / OOZE_SECONDS);
          const oozeLeft = W * pct;

          // Bar at bottom showing remaining time (fills from right as time depletes)
          this.oozeBar.clear();
          this.oozeBar.fillStyle(0x660033, 0.5);
          this.oozeBar.fillRect(oozeLeft, H - 5, W - oozeLeft, 5);

          // Ooze overlay creeping from right
          this.oozeGraphic.clear();
          for (let i = 0; i < 6; i++) {
            this.oozeGraphic.fillStyle(0x660033, 0.025 + i * 0.02);
            this.oozeGraphic.fillRect(oozeLeft + i * 5, HEADER_H + 1, W - oozeLeft - i * 5, H - HEADER_H - 6);
          }

          if (pct < 0.3) {
            this.rangeText.setStyle({ color: "#660033" });
          }
        }

        costOoze() {
          this.oozeRemaining = Math.max(0.1, this.oozeRemaining - COST_PER_TEST);
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;

          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const baseY = HEADER_H + (H - HEADER_H - 50) * 0.5;

          let clicked = -1;
          for (let i = 0; i < N; i++) {
            // Only allow clicking within current [left, right] range
            if (i < this.left || i > this.right) continue;
            if (this.revealed.has(i)) continue;
            const cx = pad + i * bw + bw / 2;
            if (Math.abs(pointer.x - cx) < bw / 2 + 2 && Math.abs(pointer.y - baseY) < bh / 2 + 6) {
              clicked = i;
              break;
            }
          }
          if (clicked < 0) return;

          this.busy = true;
          onAttempt();
          this.costOoze();
          this.testsCount++;
          this.testsText.setText(`TESTS: ${this.testsCount}`);
          playSound("click");
          emitToolUsed("Binary Search", "O(log n)");

          const isInfected = clicked >= FIRST_INFECTED;
          this.revealed.set(clicked, isInfected);

          this.revealChamber(clicked, isInfected, () => {
            if (isInfected) {
              this.right = clicked;
              // Dim all unrevealed chambers to the right of clicked
              this.dimChambers();
            } else {
              this.left = clicked + 1;
              // Dim all unrevealed chambers to the left of clicked
              this.dimChambers();
            }

            this.rangeText.setText(`SEARCH RANGE: [${this.left}, ${this.right}]`);

            if (this.left === this.right) {
              // Auto-reveal the answer
              this.time.delayedCall(200, () => this.onFound(this.left));
            } else {
              const hint = isInfected
                ? `INFECTED ☣ — PATIENT ZERO IS HERE OR LEFT · RANGE [${this.left}..${this.right}]`
                : `CLEAN ✓ — PATIENT ZERO IS TO THE RIGHT · RANGE [${this.left}..${this.right}]`;
              this.statusText.setText(hint).setStyle({ color: isInfected ? "#cc0033" : "#1a5030" });
              emitReaction(isInfected ? "DANGER" : "SLIDE_RIGHT", isInfected ? "☣ INFECTED" : "✓ CLEAN", pointer.x, pointer.y);
              playSound(isInfected ? "danger" : "correct");
              this.busy = false;
            }
          });
        }

        dimChambers() {
          for (let i = 0; i < N; i++) {
            const c = this.chambers[i];
            if (this.revealed.has(i)) continue; // keep revealed ones as-is
            if (i < this.left || i > this.right) {
              // Outside range — dim
              c.setAlpha(0.25);
              c.disableInteractive();
            } else {
              c.setAlpha(1);
              c.setInteractive({ cursor: "pointer" });
            }
          }
        }

        revealChamber(i: number, infected: boolean, done: () => void) {
          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const c = this.chambers[i];
          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          const iconText = c.getByName("icon") as Phaser.GameObjects.Text;

          bg.clear();
          if (infected) {
            bg.fillStyle(0x330011, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0xcc0033, 1);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            iconText.setText("☣").setStyle({ color: "#cc0033", fontSize: "13px" });
          } else {
            bg.fillStyle(0x001a0a, 1);
            bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            bg.lineStyle(1, 0x22c55e, 0.5);
            bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
            iconText.setText("✓").setStyle({ color: "#22c55e", fontSize: "13px" });
          }

          this.tweens.add({
            targets: c, scaleX: 1.08, scaleY: 1.08, duration: 80, yoyo: true,
            onComplete: () => this.time.delayedCall(150, done),
          });
        }

        onFound(idx: number) {
          solvedRef.current = true;
          this.oozeTimer?.remove();
          playSound("solve");

          const pad = 14;
          const bw = Math.floor((W - pad * 2) / N);
          const bh = Math.min(bw * 1.9, 78);
          const c = this.chambers[idx];

          // Make sure chamber is fully visible
          c.setAlpha(1);

          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x440011, 1);
          bg.fillRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);
          bg.lineStyle(2, 0xff0044, 1);
          bg.strokeRoundedRect(-bw / 2 + 1, -bh / 2, bw - 2, bh, 3);

          const iconText = c.getByName("icon") as Phaser.GameObjects.Text;
          iconText.setText("☣").setStyle({ color: "#ff0044", fontSize: "15px" });

          this.statusText.setText(`PATIENT ZERO: CHAMBER [${idx}] — ISOLATED`).setStyle({ color: "#ff4488" });
          emitReaction("BURST", "☣ CONTAINED", c.x, c.y);

          this.tweens.add({
            targets: c, scaleX: 1.2, scaleY: 1.2, duration: 250, yoyo: true,
            onComplete: () => this.time.delayedCall(500, () => onSolve()),
          });
        }

        showRetry() {
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.75);
          ov.fillRect(0, 0, W, H);

          this.add.text(W / 2, H / 2 - 24, "CONTAINMENT FAILED", {
            fontFamily: "monospace", fontSize: "13px", color: "#cc0033",
          }).setOrigin(0.5).setDepth(21);

          this.add.text(W / 2, H / 2 - 4, "Test the MIDDLE chamber each time to halve the range", {
            fontFamily: "monospace", fontSize: "9px", color: "#660022",
          }).setOrigin(0.5).setDepth(21);

          this.add.text(W / 2, H / 2 + 12, "Binary search = ≤5 tests   ·   Linear scan = 10+ tests (runs out of time)", {
            fontFamily: "monospace", fontSize: "8px", color: "#440011",
          }).setOrigin(0.5).setDepth(21);

          const btn = this.add.text(W / 2, H / 2 + 36, "[ RETRY ]", {
            fontFamily: "monospace", fontSize: "12px", color: "#a855f7",
            backgroundColor: "#050409", padding: { x: 16, y: 7 },
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
        parent: containerRef.current!, backgroundColor: "#050409",
        scene: OutbreakScene, render: { antialias: true },
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
