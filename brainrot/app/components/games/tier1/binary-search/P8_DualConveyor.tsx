"use client";
import { useEffect, useRef } from "react";
import type { GameProps } from "./types";
import type { Container as PixiContainer, Graphics as PixiGraphics, TextStyle as PixiTextStyle } from "pixi.js";

const A = [1, 3, 8, 9, 15];
const B = [7, 11, 18, 19, 21, 25];
const M = A.length;
const N = B.length;
const HALF = Math.floor((M + N + 1) / 2);

function computeMedian(pA: number): number | null {
  const pB = HALF - pA;
  if (pB < 0 || pB > N) return null;
  const maxLeftA = pA === 0 ? -Infinity : A[pA - 1];
  const minRightA = pA === M ? Infinity : A[pA];
  const maxLeftB = pB === 0 ? -Infinity : B[pB - 1];
  const minRightB = pB === N ? Infinity : B[pB];
  if (maxLeftA <= minRightB && maxLeftB <= minRightA) {
    const maxLeft = Math.max(maxLeftA, maxLeftB);
    const minRight = Math.min(minRightA, minRightB);
    return (M + N) % 2 === 0 ? (maxLeft + minRight) / 2 : maxLeft;
  }
  return null;
}

export default function P8_DualConveyor({ onSolve, onAttempt }: GameProps) {
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

      const SLOT_W = 52;
      const SLOT_H = 48;
      const GAP = 4;

      const rowA_Y = H / 2 - 70;
      const rowB_Y = H / 2 + 10;

      const startAX = (W - M * (SLOT_W + GAP)) / 2;
      const startBX = (W - N * (SLOT_W + GAP)) / 2;

      let partitionA = Math.floor(M / 2);
      let busy = false;

      const headerStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x374151 });
      const cardStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x94a3b8 });
      const leftStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x22c55e });
      const rightStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x475569 });
      const msgStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x374151 });

      const aLabel = new Text({ text: `Array A (${M})`, style: headerStyle });
      aLabel.x = startAX;
      aLabel.y = rowA_Y - 18;
      app.stage.addChild(aLabel);

      const bLabel = new Text({ text: `Array B (${N})`, style: headerStyle });
      bLabel.x = startBX;
      bLabel.y = rowB_Y - 18;
      app.stage.addChild(bLabel);

      const msgText = new Text({ text: "drag the partition line on Array A", style: msgStyle });
      msgText.anchor.set(0.5);
      msgText.x = W / 2;
      msgText.y = H - 28;
      app.stage.addChild(msgText);

      // Result display
      const resultText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xeab308 }) });
      resultText.anchor.set(0.5);
      resultText.x = W / 2;
      resultText.y = 32;
      app.stage.addChild(resultText);

      // Draw arrays
      const aCards: PixiContainer[] = [];
      const bCards: PixiContainer[] = [];

      function drawCards() {
        const pB = HALF - partitionA;

        // Clear existing cards
        for (const c of [...aCards, ...bCards]) app.stage.removeChild(c);
        aCards.length = 0;
        bCards.length = 0;

        for (let i = 0; i < M; i++) {
          const c = new Container();
          c.x = startAX + i * (SLOT_W + GAP) + SLOT_W / 2;
          c.y = rowA_Y + SLOT_H / 2;

          const isLeft = i < partitionA;
          const bg = new Graphics();
          bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
          bg.fill({ color: isLeft ? 0x0d1a0d : 0x111111 });
          bg.stroke({ color: isLeft ? 0x22c55e : 0x1e1e1e, width: 1, alpha: isLeft ? 0.5 : 1 });

          const lbl = new Text({ text: String(A[i]), style: isLeft ? leftStyle : rightStyle });
          lbl.anchor.set(0.5);

          c.addChild(bg, lbl);
          app.stage.addChild(c);
          aCards.push(c);
        }

        for (let i = 0; i < N; i++) {
          const c = new Container();
          c.x = startBX + i * (SLOT_W + GAP) + SLOT_W / 2;
          c.y = rowB_Y + SLOT_H / 2;

          const isLeft = i < pB;
          const bg = new Graphics();
          bg.roundRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 4);
          bg.fill({ color: isLeft ? 0x0d1a0d : 0x111111 });
          bg.stroke({ color: isLeft ? 0x22c55e : 0x1e1e1e, width: 1, alpha: isLeft ? 0.5 : 1 });

          const lbl = new Text({ text: String(B[i]), style: isLeft ? leftStyle : rightStyle });
          lbl.anchor.set(0.5);

          c.addChild(bg, lbl);
          app.stage.addChild(c);
          bCards.push(c);
        }
      }

      // Partition line on A — draggable
      let partLine: PixiGraphics;
      let splitHint: InstanceType<typeof Text> | null = null;
      let isDragging = false;

      function drawPartitionLine() {
        if (partLine) app.stage.removeChild(partLine);
        if (splitHint) app.stage.removeChild(splitHint);

        const pB = HALF - partitionA;
        partLine = new Graphics();
        const lineX = startAX + partitionA * (SLOT_W + GAP) - GAP / 2;
        partLine.moveTo(lineX, rowA_Y - 12);
        partLine.lineTo(lineX, rowA_Y + SLOT_H + 8);
        partLine.stroke({ color: 0xeab308, width: 2 });
        // Handle
        partLine.roundRect(lineX - 10, rowA_Y - 20, 20, 14, 3);
        partLine.fill({ color: 0xeab308, alpha: 0.15 });
        partLine.stroke({ color: 0xeab308, width: 1 });

        partLine.interactive = true;
        partLine.eventMode = "static";
        partLine.cursor = "ew-resize";

        partLine.on("pointerdown", () => { isDragging = true; });
        app.stage.addChild(partLine);

        // Split hint below handle
        splitHint = new Text({
          text: `A: ${partitionA}/${M}  B: ${Math.max(0, Math.min(N, pB))}/${N}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xeab308 }),
        });
        splitHint.alpha = 0.7;
        splitHint.anchor.set(0.5, 0);
        splitHint.x = lineX;
        splitHint.y = rowA_Y + SLOT_H + 12;
        app.stage.addChild(splitHint);
      }

      app.canvas.addEventListener("pointermove", (e: PointerEvent) => {
        if (!isDragging) return;
        const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const newP = Math.round((mx - startAX) / (SLOT_W + GAP));
        const clamped = Math.max(0, Math.min(M, newP));
        if (clamped !== partitionA) {
          partitionA = clamped;
          drawCards();
          drawPartitionLine();
          updateResult();
        }
      });

      app.canvas.addEventListener("pointerup", () => {
        if (isDragging) {
          isDragging = false;
          commitPartition();
        }
      });

      function updateResult() {
        const pB = HALF - partitionA;
        if (pB < 0 || pB > N) {
          resultText.text = "";
          return;
        }
        const maxLeftA = partitionA === 0 ? -Infinity : A[partitionA - 1];
        const minRightA = partitionA === M ? Infinity : A[partitionA];
        const maxLeftB = pB === 0 ? -Infinity : B[pB - 1];
        const minRightB = pB === N ? Infinity : B[pB];

        const valid = maxLeftA <= minRightB && maxLeftB <= minRightA;
        if (valid) {
          const med = computeMedian(partitionA);
          resultText.text = `median = ${med}`;
          resultText.style.fill = 0x22c55e;
        } else {
          resultText.text = maxLeftA > minRightB ? "A LEFT TOO BIG — DRAG PARTITION LEFT ←" : "B LEFT TOO BIG — DRAG PARTITION RIGHT →";
          resultText.style.fill = 0xef4444;
        }
      }

      function commitPartition() {
        if (solvedRef.current) return;
        onAttempt();
        const med = computeMedian(partitionA);
        if (med !== null) {
          solvedRef.current = true;
          msgText.text = "correct partition";
          (msgText.style as PixiTextStyle).fill = 0x22c55e;
          setTimeout(() => onSolve(), 800);
        }
      }

      drawCards();
      drawPartitionLine();
      updateResult();
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

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Instruction header — plain HTML overlay, not Pixi */}
      <div style={{
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#475569",
        background: "#0a0a0a",
        padding: "6px 12px",
        borderBottom: "1px solid #1e1e1e",
        lineHeight: "1.6",
        flexShrink: 0,
      }}>
        <div>FIND THE MEDIAN PARTITION: DRAG THE LINE ON ARRAY A LEFT/RIGHT</div>
        <div>VALID PARTITION: ALL LEFT ELEMENTS &le; ALL RIGHT ELEMENTS &nbsp;·&nbsp; BOTH ARRAYS MUST SPLIT CONSISTENTLY</div>
      </div>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}
