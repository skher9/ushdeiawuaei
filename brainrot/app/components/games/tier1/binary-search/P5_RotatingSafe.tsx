"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "./types";
import type { Container as PixiContainer, Graphics as PixiGraphics, Text as PixiText, TextStyle as PixiTextStyle } from "pixi.js";

// Rotated sorted array
const BASE = [11, 15, 19, 23, 28, 33, 37, 42, 47, 51];
const ROTATION = 3; // rotate by 3
const ARR = [...BASE.slice(ROTATION), ...BASE.slice(0, ROTATION)];
const TARGET = BASE[1 + Math.floor(Math.random() * 4)]; // random from middle

export default function P5_RotatingSafe({ onSolve, onAttempt }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<unknown>(null);
  const solvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { Application, Graphics, Text, TextStyle, Container } = await import("pixi.js");
      if (cancelled || !containerRef.current) return;

      const W = containerRef.current.clientWidth || 800;
      const H = containerRef.current.clientHeight || 500;

      const app = new Application();
      await app.init({ width: W, height: H, background: 0x0a0a0a, antialias: true });
      if (cancelled) { app.destroy(true); return; }
      appRef.current = app;
      containerRef.current.appendChild(app.canvas as HTMLCanvasElement);

      const N = ARR.length;
      const SLOT_W = Math.min(64, Math.floor((W - 40) / N));
      const SLOT_H = 56;
      const startX = (W - N * (SLOT_W + 4)) / 2;
      const baseY = H / 2 - SLOT_H / 2;

      let left = 0;
      let right = N - 1;
      let busy = false;
      const eliminated = new Set<number>();

      const targetStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xeab308 });
      const labelStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x475569 });
      const msgStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x374151 });

      const targetLabel = new Text({ text: `FIND: ${TARGET}`, style: targetStyle });
      targetLabel.anchor.set(0.5);
      targetLabel.x = W / 2;
      targetLabel.y = 28;
      app.stage.addChild(targetLabel);

      const msgText = new Text({ text: "tap a number to probe", style: msgStyle });
      msgText.anchor.set(0.5);
      msgText.x = W / 2;
      msgText.y = H - 28;
      app.stage.addChild(msgText);

      const cards: PixiContainer[] = [];
      const bgs: PixiGraphics[] = [];

      for (let i = 0; i < N; i++) {
        const c = new Container();
        c.x = startX + i * (SLOT_W + 4) + SLOT_W / 2;
        c.y = baseY + SLOT_H / 2;

        const bg = new Graphics();
        bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
        bg.fill({ color: 0x111111 });
        bg.stroke({ color: 0x1e1e1e, width: 1 });

        const lbl = new Text({ text: String(ARR[i]), style: labelStyle });
        lbl.anchor.set(0.5);

        c.addChild(bg, lbl);
        c.interactive = true;
        c.eventMode = "static";
        c.cursor = "pointer";
        app.stage.addChild(c);
        cards.push(c);
        bgs.push(bg);

        const idx = i;
        c.on("pointertap", () => {
          if (solvedRef.current || busy || eliminated.has(idx)) return;
          probe(idx);
        });

        c.on("pointerover", () => {
          if (eliminated.has(idx) || solvedRef.current) return;
          bg.clear();
          bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
          bg.fill({ color: 0x151515 });
          bg.stroke({ color: 0x22c55e, width: 1, alpha: 0.4 });
        });
        c.on("pointerout", () => {
          if (eliminated.has(idx)) return;
          bg.clear();
          bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
          bg.fill({ color: 0x111111 });
          bg.stroke({ color: 0x1e1e1e, width: 1 });
        });
      }

      function probe(clicked: number) {
        busy = true;
        onAttempt();

        const mid = clicked;
        const midVal = ARR[mid];
        const leftVal = ARR[left];
        const rightVal = ARR[right];

        // Highlight mid
        bgs[mid].clear();
        bgs[mid].roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
        bgs[mid].fill({ color: 0x0d1a0d });
        bgs[mid].stroke({ color: 0x22c55e, width: 1 });

        setTimeout(() => {
          if (midVal === TARGET) {
            solvedRef.current = true;
            bgs[mid].clear();
            bgs[mid].roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
            bgs[mid].fill({ color: 0x0d2a0d });
            bgs[mid].stroke({ color: 0x22c55e, width: 2 });
            msgText.text = `found ${TARGET}`;
            (msgText.style as PixiTextStyle).fill = 0x22c55e;
            setTimeout(() => onSolve(), 600);
            busy = false;
            return;
          }

          let toElim: number[] = [];
          if (leftVal <= midVal) {
            // Left half is sorted
            if (TARGET >= leftVal && TARGET < midVal) {
              toElim = Array.from({ length: right - mid }, (_, k) => mid + 1 + k);
              right = mid - 1;
            } else {
              toElim = Array.from({ length: mid - left + 1 }, (_, k) => left + k);
              left = mid + 1;
            }
          } else {
            // Right half is sorted
            if (TARGET > midVal && TARGET <= rightVal) {
              toElim = Array.from({ length: mid - left + 1 }, (_, k) => left + k);
              left = mid + 1;
            } else {
              toElim = Array.from({ length: right - mid }, (_, k) => mid + 1 + k);
              right = mid - 1;
            }
          }

          for (const i of toElim) {
            eliminated.add(i);
            bgs[i].clear();
            bgs[i].roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
            bgs[i].fill({ color: 0x0a0a0a, alpha: 0.3 });
            (cards[i].children[1] as PixiText).style.fill = 0x1e1e1e;
          }

          msgText.text = `${midVal} ≠ ${TARGET} — eliminated ${toElim.length} candidates`;
          busy = false;
        }, 400);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (appRef.current) {
        (appRef.current as { destroy: (r: boolean) => void }).destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
