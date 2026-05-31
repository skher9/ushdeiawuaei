"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import type { GameProps } from "./types";

// Delivery piles: how many km each delivery takes
const PILES = [3, 6, 7, 11];
const HOURS = 8; // must deliver all within HOURS hours

function hoursFor(s: number): number {
  return PILES.reduce((acc, p) => acc + Math.ceil(p / s), 0);
}

function minSpeed(): number {
  for (let s = 1; s <= 15; s++) {
    if (hoursFor(s) <= HOURS) return s;
  }
  return 15;
}
const ANSWER = minSpeed();

export default function P6_DeliveryRace({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const solvedRef = useRef(false);
  const [attempts, setAttempts] = useState(0);
  const [statusMsg, setStatusMsg] = useState("CLICK ANY SPEED TO BEGIN");

  const destroy = useCallback(() => {
    if (gameRef.current) {
      (gameRef.current as { destroy: (r: boolean) => void }).destroy(true);
      gameRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      class DeliveryScene extends Phaser.Scene {
        private left = 1;
        private right = 15;
        private busy = false;
        private bars: Phaser.GameObjects.Container[] = [];
        // Track revealed state per bar
        private revealed: boolean[] = new Array(15).fill(false);

        constructor() { super({ key: "DeliveryScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#0a0a0a");
          this.buildSpeedBars();
          this.input.on("pointerdown", this.onClick, this);
        }

        buildSpeedBars() {
          const speeds = 15;
          const barW = Math.floor((W - 60) / speeds);
          const BAR_H = 80;
          const baseY = H / 2 + 60;

          for (let s = 1; s <= speeds; s++) {
            const x = 30 + (s - 1) * barW + barW / 2;
            const c = this.add.container(x, baseY);

            // Locked bar appearance
            const bar = this.add.graphics();
            bar.fillStyle(0x1a1a2e, 1);
            bar.fillRect(-barW / 2 + 1, -BAR_H, barW - 2, BAR_H);
            bar.lineStyle(1, 0x2a2a3e, 1);
            bar.strokeRect(-barW / 2 + 1, -BAR_H, barW - 2, BAR_H);

            // Speed label below bar
            const lbl = this.add.text(0, 8, `s${s}`, {
              fontFamily: "monospace", fontSize: "9px", color: "#475569",
            }).setOrigin(0.5, 0);

            // Hours label above bar — hidden initially
            const hoursLbl = this.add.text(0, -BAR_H - 6, "", {
              fontFamily: "monospace", fontSize: "9px", color: "#1e1e1e",
            }).setOrigin(0.5, 1);

            // Lock icon text (small padlock-ish)
            const lockLbl = this.add.text(0, -BAR_H / 2, "?", {
              fontFamily: "monospace", fontSize: "10px", color: "#374151",
            }).setOrigin(0.5, 0.5);

            c.add([bar, lbl, hoursLbl, lockLbl]);
            c.setData("speed", s);
            c.setSize(barW, BAR_H + 30);
            c.setInteractive();
            this.bars.push(c);
          }
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;
          const speeds = 15;
          const barW = Math.floor((W - 60) / speeds);
          const s = Math.floor((pointer.x - 30) / barW) + 1;
          if (s < 1 || s > speeds) return;
          // Don't re-click eliminated bars
          const c = this.bars[s - 1];
          if (c.alpha < 0.5) return;
          this.trySpeed(s);
        }

        trySpeed(clicked: number) {
          this.busy = true;
          onAttempt();
          setAttempts(a => a + 1);

          const BAR_H = 80;
          const hours = hoursFor(clicked);
          const canFinish = hours <= HOURS;
          const barW = Math.floor((W - 60) / 15);

          // Reveal this bar
          this.revealed[clicked - 1] = true;
          const c = this.bars[clicked - 1];
          const bar = c.list[0] as Phaser.GameObjects.Graphics;
          const hoursLbl = c.list[2] as Phaser.GameObjects.Text;
          const lockLbl = c.list[3] as Phaser.GameObjects.Text;

          // Redraw bar with color
          bar.clear();
          const color = canFinish ? 0x22c55e : 0xef4444;
          bar.fillStyle(color, 0.15);
          bar.fillRect(-barW / 2 + 1, -BAR_H, barW - 2, BAR_H);
          bar.lineStyle(1, color, 0.5);
          bar.strokeRect(-barW / 2 + 1, -BAR_H, barW - 2, BAR_H);

          // Show hours label
          hoursLbl.setText(`${hours}h`).setStyle({ color: canFinish ? "#22c55e" : "#ef4444" });
          lockLbl.setText("").setVisible(false);

          const direction = canFinish ? "WORKS, TRY SLOWER" : "TOO SLOW, NEED FASTER";
          setStatusMsg(`SPEED ${clicked}: ${hours}h — ${direction}`);

          setTimeout(() => {
            if (canFinish) {
              // Check if this is the minimum: left neighbor doesn't work
              if (clicked === this.left || !this.canFinishAt(clicked - 1)) {
                solvedRef.current = true;
                setStatusMsg(`MINIMUM SPEED: ${clicked} km/h`);
                this.time.delayedCall(700, () => onSolve());
              } else {
                this.right = clicked;
                // Dim bars to the right of clicked (they all work or are above)
                this.dimBars(clicked + 1, 15);
              }
            } else {
              this.left = clicked + 1;
              // Dim bars at and to the left of clicked (too slow)
              this.dimBars(1, clicked);
            }
            this.busy = false;
          }, 400);
        }

        canFinishAt(s: number): boolean {
          return hoursFor(s) <= HOURS;
        }

        dimBars(from: number, to: number) {
          for (let s = from; s <= to; s++) {
            const c = this.bars[s - 1];
            // Only dim if not already revealed with a result color
            if (!this.revealed[s - 1]) {
              c.setAlpha(0.2);
            }
          }
        }
      }

      destroy();
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: W,
        height: H,
        parent: containerRef.current,
        backgroundColor: "#0a0a0a",
        scene: DeliveryScene,
      });
    }

    init();
    return () => { cancelled = true; destroy(); };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Instruction header — plain HTML, not Phaser */}
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
          <span style={{ color: "#94a3b8", fontWeight: "bold" }}>// DELIVERY RACE</span>
          <span>ATTEMPTS: {attempts}</span>
        </div>
        <div>FIND MINIMUM SPEED: CAN FINISH [{PILES.join(",")}] km IN {HOURS}h?</div>
        <div>CLICK ANY SPEED → REVEALS TOTAL HOURS → <span style={{ color: "#22c55e" }}>GREEN=WORKS</span> / <span style={{ color: "#ef4444" }}>RED=TOO SLOW</span></div>
        <div>TOO SLOW = NEED FASTER SPEED (go right) &nbsp;·&nbsp; WORKS = TRY SLOWER (go left)</div>
        <div style={{ marginTop: "4px", color: solvedRef.current ? "#22c55e" : "#374151" }}>{statusMsg}</div>
      </div>
      {/* Phaser canvas fills remaining space */}
      <div ref={containerRef} style={{ flex: 1, cursor: "pointer" }} />
    </div>
  );
}
