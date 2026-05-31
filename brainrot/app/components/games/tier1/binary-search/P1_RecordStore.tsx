"use client";
import { useEffect, useRef, useCallback } from "react";
import type { GameProps } from "./types";

const N = 16;
const TARGET = Math.floor(Math.random() * N);

export default function P1_RecordStore({ onSolve, onAttempt }: GameProps) {
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

      class RecordScene extends Phaser.Scene {
        private records: Phaser.GameObjects.Container[] = [];
        private left = 0;
        private right = N - 1;
        private mid = -1;
        private eliminated: Set<number> = new Set();
        private dartGraphic?: Phaser.GameObjects.Graphics;
        private hintText?: Phaser.GameObjects.Text;
        private busy = false;

        constructor() { super({ key: "RecordScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#0a0a0a");
          this.buildShelf();
          this.dartGraphic = this.add.graphics();
          this.hintText = this.add.text(W / 2, H - 30, "", {
            fontFamily: "monospace", fontSize: "11px", color: "#374151", align: "center",
          }).setOrigin(0.5, 1);
          this.input.on("pointerdown", this.onClick, this);
        }

        buildShelf() {
          const slotW = Math.floor((W - 40) / N);
          const slotH = Math.min(slotW * 2.2, 120);
          const shelfY = H / 2 - slotH / 2;

          for (let i = 0; i < N; i++) {
            const x = 20 + i * slotW + slotW / 2;
            const container = this.add.container(x, shelfY + slotH / 2);

            const bg = this.add.graphics();
            const col = i === TARGET ? "#1a3a1a" : "#111";
            bg.fillStyle(Phaser.Display.Color.HexStringToColor(col).color, 1);
            bg.fillRoundedRect(-slotW / 2 + 2, -slotH / 2, slotW - 4, slotH, 3);
            bg.lineStyle(1, 0x1e1e1e, 1);
            bg.strokeRoundedRect(-slotW / 2 + 2, -slotH / 2, slotW - 4, slotH, 3);

            const label = this.add.text(0, 0, String(i + 1), {
              fontFamily: "monospace", fontSize: "10px", color: "#374151",
            }).setOrigin(0.5);

            container.add([bg, label]);
            container.setData("index", i);
            container.setSize(slotW, slotH);
            container.setInteractive();
            this.records.push(container);
          }
        }

        getSlotX(i: number): number {
          const slotW = Math.floor((W - 40) / N);
          return 20 + i * slotW + slotW / 2;
        }

        onClick(pointer: Phaser.Input.Pointer) {
          if (this.busy || solvedRef.current) return;
          const slotW = Math.floor((W - 40) / N);
          const clickedIdx = Math.floor((pointer.x - 20) / slotW);
          if (clickedIdx < 0 || clickedIdx >= N) return;
          if (this.eliminated.has(clickedIdx)) return;

          this.busy = true;
          this.mid = clickedIdx;
          const snappedX = this.getSlotX(this.mid);

          if (!solvedRef.current) onAttempt();

          this.dartGraphic!.clear();
          this.drawDart(snappedX, 20);

          this.time.delayedCall(300, () => {
            this.tweens.add({
              targets: { y: 20 },
              y: H / 2 - 60,
              duration: 250,
              onUpdate: (_, obj: { y: number }) => {
                this.dartGraphic!.clear();
                this.drawDart(snappedX, obj.y);
              },
              onComplete: () => this.evalMid(),
            });
          });
        }

        drawDart(x: number, y: number) {
          this.dartGraphic!.lineStyle(2, 0x22c55e, 1);
          this.dartGraphic!.lineBetween(x, y, x, y + 20);
          this.dartGraphic!.fillStyle(0x22c55e, 1);
          this.dartGraphic!.fillTriangle(x - 5, y, x + 5, y, x, y + 12);
        }

        evalMid() {
          const midRecord = this.records[this.mid];
          if (this.mid === TARGET) {
            this.highlightFound(this.mid);
            this.hintText!.setText("found").setStyle({ color: "#22c55e" });
            solvedRef.current = true;
            this.time.delayedCall(600, () => onSolve());
          } else {
            const goRight = TARGET > this.mid;
            const toElim = goRight
              ? Array.from({ length: this.mid - this.left + 1 }, (_, k) => this.left + k)
              : Array.from({ length: this.right - this.mid + 1 }, (_, k) => this.mid + k);

            for (const i of toElim) this.eliminated.add(i);
            if (goRight) this.left = this.mid + 1;
            else this.right = this.mid - 1;

            this.flyOff(toElim, goRight, () => {
              this.dartGraphic!.clear();
              this.busy = false;
            });
          }
        }

        highlightFound(i: number) {
          const c = this.records[i];
          const bg = c.list[0] as Phaser.GameObjects.Graphics;
          bg.clear();
          bg.fillStyle(0x22c55e, 0.2);
          const slotW = Math.floor((W - 40) / N);
          const slotH = Math.min(slotW * 2.2, 120);
          bg.fillRoundedRect(-slotW / 2 + 2, -slotH / 2, slotW - 4, slotH, 3);
          bg.lineStyle(1, 0x22c55e, 0.5);
          bg.strokeRoundedRect(-slotW / 2 + 2, -slotH / 2, slotW - 4, slotH, 3);
        }

        flyOff(indices: number[], toLeft: boolean, done: () => void) {
          let pending = indices.length;
          if (pending === 0) { done(); return; }
          for (const i of indices) {
            const c = this.records[i];
            const label = c.list[1] as Phaser.GameObjects.Text;
            label.setStyle({ color: "#1e1e1e" });
            this.tweens.add({
              targets: c,
              x: toLeft ? -80 : W + 80,
              alpha: 0,
              duration: 280 + Math.random() * 80,
              ease: "Power2",
              onComplete: () => {
                pending--;
                if (pending === 0) done();
              },
            });
          }
        }
      }

      destroy();
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: W,
        height: H,
        parent: containerRef.current,
        backgroundColor: "#0a0a0a",
        scene: RecordScene,
        render: { antialias: true },
      };
      gameRef.current = new Phaser.Game(config);
    }

    init();
    return () => {
      cancelled = true;
      destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", cursor: "crosshair" }}
    />
  );
}
