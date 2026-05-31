"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "./types";
import type { Graphics as PixiGraphics, Container as PixiContainer } from "pixi.js";

const QUEUE = [12, 23, 31, 45, 56, 67, 78, 89];
const VIP = 50;

export default function P3_NightclubQueue({ onSolve, onAttempt }: GameProps) {
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

      const N = QUEUE.length;
      const SLOT_W = Math.min(70, Math.floor((W - 60) / (N + 2)));
      const SLOT_H = 60;
      const startX = (W - (N + 1) * (SLOT_W + 4)) / 2;
      const baseY = H / 2 - SLOT_H / 2;

      let left = 0;
      let right = N;
      let insertPos = -1;
      let busy = false;

      const labelStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x475569 });
      const vipStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xeab308, fontWeight: "bold" });
      const msgStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x374151 });

      // VIP label at top
      const vipLabel = new Text({ text: `VIP: ${VIP}`, style: vipStyle });
      vipLabel.anchor.set(0.5);
      vipLabel.x = W / 2;
      vipLabel.y = 32;
      app.stage.addChild(vipLabel);

      const msgText = new Text({ text: "where does the VIP go?", style: msgStyle });
      msgText.anchor.set(0.5);
      msgText.x = W / 2;
      msgText.y = H - 30;
      app.stage.addChild(msgText);

      // Queue cards
      const cards: PixiContainer[] = [];
      for (let i = 0; i < N; i++) {
        const c = new Container();
        c.x = startX + i * (SLOT_W + 4) + SLOT_W / 2;
        c.y = baseY + SLOT_H / 2;

        const bg = new Graphics();
        bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
        bg.fill({ color: 0x111111 });
        bg.stroke({ color: 0x1e1e1e, width: 1 });

        const lbl = new Text({ text: String(QUEUE[i]), style: labelStyle });
        lbl.anchor.set(0.5);

        c.addChild(bg, lbl);
        app.stage.addChild(c);
        cards.push(c);
      }

      // Gaps (N+1 clickable zones between/before/after cards)
      const gaps: PixiGraphics[] = [];
      for (let i = 0; i <= N; i++) {
        const gx = startX + i * (SLOT_W + 4) - 2;
        const g = new Graphics();
        g.rect(gx - 6, baseY - 4, 12, SLOT_H + 8);
        g.fill({ color: 0x1a1a2e, alpha: 0.01 });
        g.interactive = true;
        g.cursor = "pointer";
        g.eventMode = "static";

        const bar = new Graphics();
        bar.rect(gx - 1, baseY, 2, SLOT_H);
        bar.fill({ color: 0x1e1e1e });
        app.stage.addChild(bar);
        app.stage.addChild(g);
        gaps.push(g);

        g.on("pointerover", () => {
          bar.clear();
          bar.rect(gx - 1, baseY, 2, SLOT_H);
          bar.fill({ color: 0x22c55e, alpha: 0.7 });
        });
        g.on("pointerout", () => {
          bar.clear();
          bar.rect(gx - 1, baseY, 2, SLOT_H);
          bar.fill({ color: insertPos === i ? 0x22c55e : 0x1e1e1e });
        });

        const gapIdx = i;
        g.on("pointertap", () => {
          if (solvedRef.current || busy) return;
          busy = true;
          onAttempt();

          insertPos = gapIdx;

          const leftOk = gapIdx === 0 || QUEUE[gapIdx - 1] < VIP;
          const rightOk = gapIdx === N || QUEUE[gapIdx] >= VIP;

          if (leftOk && rightOk) {
            solvedRef.current = true;
            msgText.text = `correct — VIP slots in at position ${gapIdx}`;
            msgText.style.fill = 0x22c55e;
            highlightInsert(gapIdx, gx);
            setTimeout(() => onSolve(), 700);
          } else if (!rightOk) {
            // QUEUE[gapIdx] < VIP — need to go right
            left = gapIdx + 1;
            msgText.text = `${VIP} > ${QUEUE[gapIdx]} — look RIGHT`;
          } else {
            // QUEUE[gapIdx-1] >= VIP — need to go left
            right = gapIdx - 1;
            msgText.text = `${VIP} < ${QUEUE[gapIdx - 1]} — look LEFT`;
          }
          busy = false;
        });
      }

      function highlightInsert(pos: number, gx: number) {
        // Draw VIP card at position
        const vipCard = new Container();
        vipCard.x = gx + SLOT_W / 2 + 4;
        vipCard.y = baseY + SLOT_H / 2;

        const bg = new Graphics();
        bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
        bg.fill({ color: 0x1a2a0a });
        bg.stroke({ color: 0x22c55e, width: 1 });

        const lbl = new Text({ text: `${VIP}★`, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x22c55e }) });
        lbl.anchor.set(0.5);

        vipCard.addChild(bg, lbl);
        app.stage.addChild(vipCard);
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
