"use client";
import { useEffect, useRef, useCallback } from "react";
import type { GameProps } from "./types";

// Packages to deliver: distances from base
const PACKAGES = [3, 7, 12, 5, 9, 15, 4, 11];
const ANSWER = Math.max(...PACKAGES); // minimum battery to deliver all = max distance

export default function P4_DroneMission({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const solvedRef = useRef(false);

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

      const MIN_BATTERY = 1;
      const MAX_BATTERY = 20;

      class DroneScene extends Phaser.Scene {
        private left = MIN_BATTERY;
        private right = MAX_BATTERY;
        private mid = -1;
        private eliminated: Set<number> = new Set();
        private bars: Phaser.GameObjects.Container[] = [];
        private drone?: Phaser.GameObjects.Graphics;
        private msgText?: Phaser.GameObjects.Text;
        private busy = false;

        constructor() { super({ key: "DroneScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#0a0a0a");
          this.buildBatteryBars();
          this.msgText = this.add.text(W / 2, H - 28, "select a battery level", {
            fontFamily: "monospace", fontSize: 11, color: "#374151",
          }).setOrigin(0.5, 1);

          this.drone = this.add.graphics();
          this.drawDrone(W / 2, 30);

          this.input.on("pointerdown", this.onClick, this);
        }

        buildBatteryBars() {
          const range = MAX_BATTERY - MIN_BATTERY + 1;
          const barW = Math.floor((W - 60) / range);
          const barMaxH = 140;
          const baseY = H / 2 + 30;

          for (let v = MIN_BATTERY; v <= MAX_BATTERY; v++) {
            const i = v - MIN_BATTERY;
            const barH = Math.floor((v / MAX_BATTERY) * barMaxH);
            const x = 30 + i * barW + barW / 2;
            const container = this.add.container(x, baseY);

            const bar = this.add.graphics();
            const col = 0x1a1a2e;
            bar.fillStyle(col, 1);
            bar.fillRect(-barW / 2 + 1, -barH, barW - 2, barH);
            bar.lineStyle(1, 0x1e1e1e, 1);
            bar.strokeRect(-barW / 2 + 1, -barH, barW - 2, barH);

            const label = this.add.text(0, 8, String(v), {
              fontFamily: "monospace", fontSize: "9px", color: "#374151",
            }).setOrigin(0.5, 0);

            container.add([bar, label]);
            container.setData("value", v);
            container.setSize(barW, barMaxH + 20);
            container.setInteractive();
            this.bars.push(container);
          }
        }

        getBarX(v: number): number {
          const range = MAX_BATTERY - MIN_BATTERY + 1;
          const barW = Math.floor((W - 60) / range);
          return 30 + (v - MIN_BATTERY) * barW + barW / 2;
        }

        drawDrone(x: number, y: number) {
          this.drone!.clear();
          this.drone!.fillStyle(0x22c55e, 1);
          this.drone!.fillTriangle(x - 8, y + 6, x + 8, y + 6, x, y - 6);
          this.drone!.lineStyle(1, 0x22c55e, 0.4);
          this.drone!.lineBetween(x, y + 6, x, H / 2 - 60);
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;
          const range = MAX_BATTERY - MIN_BATTERY + 1;
          const barW = Math.floor((W - 60) / range);
          const v = Math.floor((pointer.x - 30) / barW) + MIN_BATTERY;
          if (v < MIN_BATTERY || v > MAX_BATTERY) return;
          if (this.eliminated.has(v)) return;
          this.tryBattery(v);
        }

        tryBattery(clicked: number) {
          this.busy = true;
          this.mid = clicked;
          onAttempt();

          const midX = this.getBarX(this.mid);
          this.tweens.add({
            targets: this.drone,
            x: midX - W / 2,
            duration: 200,
            onUpdate: () => this.drawDrone(W / 2 + (this.drone!.x ?? 0), 30),
            onComplete: () => this.evalBattery(),
          });

          this.highlightBar(this.mid, 0x22c55e);
          this.msgText!.setText(`testing battery ${this.mid}...`);
        }

        canDeliver(battery: number): boolean {
          return battery >= ANSWER;
        }

        evalBattery() {
          if (this.canDeliver(this.mid)) {
            // This works — maybe lower works too?
            if (this.mid === this.left || !this.canDeliver(this.mid - 1)) {
              // Found minimum
              this.msgText!.setText(`minimum battery: ${this.mid}`).setStyle({ color: "#22c55e" });
              this.highlightBar(this.mid, 0x22c55e);
              solvedRef.current = true;
              this.time.delayedCall(600, () => onSolve());
            } else {
              // Try lower
              for (let v = this.mid + 1; v <= this.right; v++) this.eliminated.add(v);
              this.right = this.mid;
              this.dimBars("right");
              this.msgText!.setText(`${this.mid} works — try lower`);
            }
          } else {
            // Doesn't work — need more
            for (let v = this.left; v <= this.mid; v++) this.eliminated.add(v);
            this.left = this.mid + 1;
            this.dimBars("left");
            this.msgText!.setText(`${this.mid} not enough — need more`);
          }
          this.busy = false;
        }

        highlightBar(v: number, color: number) {
          const i = v - MIN_BATTERY;
          if (i < 0 || i >= this.bars.length) return;
          const bar = this.bars[i].list[0] as Phaser.GameObjects.Graphics;
          const range = MAX_BATTERY - MIN_BATTERY + 1;
          const barW = Math.floor((W - 60) / range);
          const barMaxH = 140;
          const barH = Math.floor((v / MAX_BATTERY) * barMaxH);
          bar.clear();
          bar.fillStyle(color, 0.2);
          bar.fillRect(-barW / 2 + 1, -barH, barW - 2, barH);
          bar.lineStyle(1, color, 0.5);
          bar.strokeRect(-barW / 2 + 1, -barH, barW - 2, barH);
        }

        dimBars(side: "left" | "right") {
          for (const v of this.eliminated) {
            const i = v - MIN_BATTERY;
            if (i < 0 || i >= this.bars.length) continue;
            const lbl = this.bars[i].list[1] as Phaser.GameObjects.Text;
            lbl.setStyle({ color: "#1e1e1e" });
            const bar = this.bars[i].list[0] as Phaser.GameObjects.Graphics;
            const range = MAX_BATTERY - MIN_BATTERY + 1;
            const barW = Math.floor((W - 60) / range);
            const barMaxH = 140;
            const barH = Math.floor((v / MAX_BATTERY) * barMaxH);
            bar.clear();
            bar.fillStyle(0x111111, 1);
            bar.fillRect(-barW / 2 + 1, -barH, barW - 2, barH);
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
        scene: DroneScene,
      });
    }

    init();
    return () => {
      cancelled = true;
      destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "pointer" }} />;
}
