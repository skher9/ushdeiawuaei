"use client";
// LC #410 — Split Array Largest Sum
// HEIST COORDINATOR: 3 phases teaching binary search on answer space.
// Phase 1: Drag dividers (learn the problem)
// Phase 2: Feasibility check (discover monotonicity)
// Phase 3: Binary search on [max, sum] (optimal O(n log sum))
import { useEffect, useRef } from "react";
import type { GameProps } from "../types";
import { playSound } from "../SoundEngine";
import { emitReaction } from "../FloatingReactions";

const N = 8;
const K = 3;
const ROOM_W = 60;
const ROOM_H = 80;
const TEAM_COLORS = [0x3b82f6, 0x22c55e, 0xf97316];
const TEAM_HEX = ["#3b82f6", "#22c55e", "#f97316"];

function generateRooms(): number[] {
  let arr: number[];
  do {
    arr = Array.from({ length: N }, () => 3 + Math.floor(Math.random() * 13));
  } while (Math.max(...arr) > arr.reduce((a, b) => a + b, 0) * 0.6);
  return arr;
}

function canSplit(rooms: number[], maxHeat: number, k: number): boolean {
  let teams = 1, cur = 0;
  for (const r of rooms) {
    if (r > maxHeat) return false;
    if (cur + r > maxHeat) { if (++teams > k) return false; cur = r; }
    else cur += r;
  }
  return true;
}

function optimalAnswer(rooms: number[], k: number): number {
  let lo = Math.max(...rooms), hi = rooms.reduce((a, b) => a + b, 0);
  while (lo < hi) { const mid = (lo + hi) >> 1; if (canSplit(rooms, mid, k)) hi = mid; else lo = mid + 1; }
  return lo;
}

function heatColor(v: number): number {
  if (v <= 3) return 0x1e4a7a;
  if (v <= 6) return 0x7a7a1e;
  if (v <= 9) return 0x7a4a1e;
  return 0x7a1e1e;
}

function emitToolUsed(tool: string, complexity: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("bs-tool-used", { detail: { tool, complexity } }));
}

export default function HeistCoordinator({ onSolve, onAttempt }: GameProps) {
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
      const H = containerRef.current.clientHeight || 520;

      const ROOMS = generateRooms();
      const OPTIMAL = optimalAnswer(ROOMS, K);
      const SUM = ROOMS.reduce((a, b) => a + b, 0);
      const MAX_ROOM = Math.max(...ROOMS);

      const bpX = Math.floor(W / 2 - (N * ROOM_W) / 2);  // blueprint left edge
      const bpPad = 20;
      const bpW = N * ROOM_W + bpPad * 2;
      const bpY = Math.floor(H * 0.19);
      const roomsTop = bpY + 34;
      const bpH = ROOM_H + 60;

      const GAUGE_X = bpX + N * ROOM_W + 20;
      const GAUGE_W = Math.min(W - GAUGE_X - 12, 110);
      const GAUGE_H = 16;
      const GAUGE_SPACING = 28;

      const NL_Y = bpY + bpH + 20;   // number line Y

      class HeistScene extends Phaser.Scene {
        private dividers: [number, number] = [2, 5];
        private phase: "manual" | "feasibility" | "binary" = "manual";
        private anxietyPct = 0;
        private manualAttempts = 0;
        private feasibilityAttempts = 0;
        private binaryAttempts = 0;
        private totalAttempts = 0;
        private bsLow = MAX_ROOM;
        private bsHigh = SUM;
        private bsHistory: { mid: number; feasible: boolean }[] = [];
        private logEntries: { text: string; color: string }[] = [];
        private simRunning = false;

        // Permanent UI objects
        private teamTints: Phaser.GameObjects.Graphics[] = [];
        private divGfx: Phaser.GameObjects.Graphics[] = [];
        private gaugeFills: Phaser.GameObjects.Graphics[] = [];
        private gaugeVals: Phaser.GameObjects.Text[] = [];
        private bottleneckTxt!: Phaser.GameObjects.Text;
        private anxietyFill!: Phaser.GameObjects.Graphics;
        private anxietyPctTxt!: Phaser.GameObjects.Text;
        private logContainer!: Phaser.GameObjects.Container;
        private nlGfx!: Phaser.GameObjects.Graphics;
        private nlTexts: Phaser.GameObjects.Text[] = [];

        // Phase-specific UI (destroyed on phase change)
        private phaseObjs: Phaser.GameObjects.GameObject[] = [];

        private draggingDiv: number | null = null;
        private toolSelectHandler!: (e: Event) => void;

        constructor() { super({ key: "HeistScene" }); }

        create() {
          this.cameras.main.setBackgroundColor("#0a0a08");
          this.drawBg();
          this.drawBlueprint();
          this.buildRooms();
          this.buildTeamTints();
          this.buildDividers();
          this.buildGauges();
          this.buildAnxietyBar();
          this.buildLog();
          this.nlGfx = this.add.graphics().setDepth(4);

          this.toolSelectHandler = (e: Event) => {
            const tool = (e as CustomEvent).detail.tool as string;
            if (tool === "Feasibility Check") this.goPhase2();
            else if (tool === "Binary Search") this.goPhase3();
            else if (tool === "Manual Split") this.goPhase1();
          };
          window.addEventListener("bs-tool-select", this.toolSelectHandler);
          this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("bs-tool-select", this.toolSelectHandler);
          });

          this.input.on("pointerdown", this.onDown, this);
          this.input.on("pointermove", this.onMove, this);
          this.input.on("pointerup", () => { this.draggingDiv = null; });

          this.goPhase1();
        }

        // ── BACKGROUND ──────────────────────────────────────────────────────────

        drawBg() {
          const g = this.add.graphics();
          g.fillStyle(0x0f0e0a, 1);
          g.fillRect(0, 0, W, H);
          for (let y = 0; y < H; y += 18) { g.lineStyle(1, 0x131208, 0.6); g.lineBetween(0, y, W, y); }
          // Lamp glow
          const lamp = this.add.graphics();
          lamp.fillStyle(0xfff8e0, 0.05);
          lamp.fillCircle(W / 2, H * 0.4, H * 0.55);
          lamp.fillStyle(0xfff8e0, 0.04);
          lamp.fillCircle(W / 2, H * 0.4, H * 0.32);
        }

        drawBlueprint() {
          const g = this.add.graphics();
          g.fillStyle(0x16160c, 1);
          g.fillRect(bpX - bpPad, bpY - bpPad, bpW, bpH + bpPad);
          g.lineStyle(1, 0x2e2e1a, 1);
          g.strokeRect(bpX - bpPad, bpY - bpPad, bpW, bpH + bpPad);
          for (let gx = bpX - bpPad; gx < bpX - bpPad + bpW; gx += 20) { g.lineStyle(1, 0x1a1a0e, 0.5); g.lineBetween(gx, bpY - bpPad, gx, bpY - bpPad + bpH + bpPad); }
          for (let gy = bpY - bpPad; gy < bpY - bpPad + bpH + bpPad; gy += 20) { g.lineStyle(1, 0x1a1a0e, 0.5); g.lineBetween(bpX - bpPad, gy, bpX - bpPad + bpW, gy); }
          this.add.text(W / 2, bpY + ROOM_H / 2 + 30, "VAULT FLOOR PLAN", {
            fontFamily: "monospace", fontSize: "11px", color: "#1a1a08", letterSpacing: 6,
          }).setOrigin(0.5).setAlpha(0.5).setAngle(-10);
          this.add.text(W / 2, bpY - 16, `8 SECURITY ROOMS — 3 TEAMS — MINIMIZE MAX HEAT`, {
            fontFamily: "monospace", fontSize: "9px", color: "#333322", letterSpacing: 1,
          }).setOrigin(0.5);
        }

        buildRooms() {
          for (let i = 0; i < N; i++) {
            const rx = bpX + i * ROOM_W;
            const g = this.add.graphics().setDepth(2);
            g.fillStyle(heatColor(ROOMS[i]), 1);
            g.fillRect(rx, roomsTop, ROOM_W, ROOM_H);
            g.lineStyle(2, 0x2a2a00, 1);
            g.strokeRect(rx, roomsTop, ROOM_W, ROOM_H);
            this.add.text(rx + ROOM_W / 2, roomsTop + ROOM_H / 2 + 2, String(ROOMS[i]), {
              fontFamily: "monospace", fontSize: "18px", color: "#f0f0f0", fontStyle: "bold",
            }).setOrigin(0.5).setDepth(3);
            this.add.text(rx + ROOM_W / 2, roomsTop - 12, `R${i + 1}`, {
              fontFamily: "monospace", fontSize: "10px", color: "#555544",
            }).setOrigin(0.5).setDepth(2);
          }
        }

        buildTeamTints() {
          for (let t = 0; t < K; t++) this.teamTints.push(this.add.graphics().setDepth(1));
          this.refreshTints();
        }

        refreshTints() {
          const [d1, d2] = this.dividers;
          const spans: [number, number][] = [[0, d1], [d1, d2], [d2, N]];
          for (let t = 0; t < K; t++) {
            const g = this.teamTints[t];
            g.clear();
            const [s, e] = spans[t];
            g.fillStyle(TEAM_COLORS[t], 0.2);
            g.fillRect(bpX + s * ROOM_W, roomsTop, (e - s) * ROOM_W, ROOM_H);
          }
          this.refreshGauges();
          this.refreshBottleneck();
        }

        buildDividers() {
          for (let d = 0; d < 2; d++) {
            const g = this.add.graphics().setDepth(6);
            this.divGfx.push(g);
          }
          this.refreshDividers();
        }

        refreshDividers() {
          for (let d = 0; d < 2; d++) {
            const x = bpX + this.dividers[d] * ROOM_W;
            const g = this.divGfx[d];
            g.clear();
            g.lineStyle(3, 0xeab308, 0.9);
            g.lineBetween(x, roomsTop - 6, x, roomsTop + ROOM_H + 6);
            // Diamond handle
            g.fillStyle(0xeab308, 1);
            g.fillTriangle(x - 7, roomsTop - 6, x + 7, roomsTop - 6, x, roomsTop - 16);
          }
        }

        buildGauges() {
          const startY = roomsTop + 4;
          for (let t = 0; t < K; t++) {
            const y = startY + t * GAUGE_SPACING;
            this.add.text(GAUGE_X, y - 11, `TEAM ${t + 1}`, {
              fontFamily: "monospace", fontSize: "8px", color: TEAM_HEX[t],
            }).setDepth(4);
            const bg = this.add.graphics().setDepth(4);
            bg.fillStyle(0x1a1a1a, 1);
            bg.fillRect(GAUGE_X, y, GAUGE_W, GAUGE_H);
            const fill = this.add.graphics().setDepth(5);
            this.gaugeFills.push(fill);
            const val = this.add.text(GAUGE_X + GAUGE_W + 5, y + GAUGE_H / 2, "0", {
              fontFamily: "monospace", fontSize: "10px", color: TEAM_HEX[t],
            }).setOrigin(0, 0.5).setDepth(5);
            this.gaugeVals.push(val);
          }
          this.bottleneckTxt = this.add.text(GAUGE_X, startY + K * GAUGE_SPACING + 6, "BOTTLENECK: --", {
            fontFamily: "monospace", fontSize: "9px", color: "#ef4444",
          }).setDepth(4);
        }

        refreshGauges() {
          const [d1, d2] = this.dividers;
          const spans: [number, number][] = [[0, d1], [d1, d2], [d2, N]];
          const sums = spans.map(([s, e]) => ROOMS.slice(s, e).reduce((a, b) => a + b, 0));
          const maxS = Math.max(...sums);
          const startY = roomsTop + 4;
          for (let t = 0; t < K; t++) {
            const y = startY + t * GAUGE_SPACING;
            const pct = Math.min(sums[t] / SUM, 1);
            const isHot = sums[t] === maxS;
            this.gaugeFills[t].clear();
            this.gaugeFills[t].fillStyle(isHot ? 0xef4444 : TEAM_COLORS[t], 1);
            this.gaugeFills[t].fillRect(GAUGE_X, y, GAUGE_W * pct, GAUGE_H);
            this.gaugeVals[t].setText(String(sums[t]));
          }
        }

        refreshBottleneck() {
          const [d1, d2] = this.dividers;
          const spans: [number, number][] = [[0, d1], [d1, d2], [d2, N]];
          const bn = Math.max(...spans.map(([s, e]) => ROOMS.slice(s, e).reduce((a, b) => a + b, 0)));
          const col = bn <= OPTIMAL ? "#22c55e" : bn <= OPTIMAL * 1.2 ? "#eab308" : "#ef4444";
          this.bottleneckTxt.setText(`BOTTLENECK: ${bn}`).setStyle({ color: col });
        }

        buildAnxietyBar() {
          const g = this.add.graphics();
          g.fillStyle(0x111111, 1);
          g.fillRect(0, 4, W, 18);
          this.add.text(10, 13, "CREW ANXIETY", {
            fontFamily: "monospace", fontSize: "7px", color: "#333", letterSpacing: 2,
          }).setOrigin(0, 0.5).setDepth(3);
          this.anxietyFill = this.add.graphics().setDepth(2);
          this.anxietyPctTxt = this.add.text(W - 10, 13, "0%", {
            fontFamily: "monospace", fontSize: "8px", color: "#444",
          }).setOrigin(1, 0.5).setDepth(3);
          this.refreshAnxiety();
        }

        refreshAnxiety() {
          this.anxietyFill.clear();
          const col = this.anxietyPct >= 80 ? 0xef4444 : this.anxietyPct >= 60 ? 0xf97316 : 0x6a2a6a;
          this.anxietyFill.fillStyle(col, 0.75);
          this.anxietyFill.fillRect(0, 4, W * (this.anxietyPct / 100), 18);
          this.anxietyPctTxt.setText(`${Math.round(this.anxietyPct)}%`).setStyle({
            color: this.anxietyPct >= 80 ? "#ef4444" : "#444",
          });
        }

        addAnxiety(pct: number) {
          this.anxietyPct = Math.min(100, this.anxietyPct + pct);
          this.refreshAnxiety();
          if (this.anxietyPct >= 100 && !solvedRef.current) {
            this.time.delayedCall(300, () => this.showAbort());
          }
        }

        buildLog() {
          this.add.text(8, 28, "LOG", {
            fontFamily: "monospace", fontSize: "7px", color: "#2a2a2a", letterSpacing: 2,
          });
          this.logContainer = this.add.container(8, 40);
        }

        addLog(text: string, color: string) {
          this.logEntries.push({ text, color });
          (this.logContainer.list as Phaser.GameObjects.Text[]).forEach(t => t.destroy());
          this.logContainer.removeAll();
          this.logEntries.slice(-9).forEach((e, i) => {
            this.logContainer.add(this.add.text(0, i * 12, e.text, {
              fontFamily: "monospace", fontSize: "8px", color: e.color,
            }));
          });
        }

        // ── DRAG ─────────────────────────────────────────────────────────────────

        onDown(p: Phaser.Input.Pointer) {
          if (this.phase !== "manual" || solvedRef.current) return;
          for (let d = 0; d < 2; d++) {
            const gx = bpX + this.dividers[d] * ROOM_W;
            if (Math.abs(p.x - gx) < 18 && p.y > roomsTop - 24 && p.y < roomsTop + ROOM_H + 10) {
              this.draggingDiv = d;
              return;
            }
          }
        }

        onMove(p: Phaser.Input.Pointer) {
          if (this.draggingDiv === null || this.phase !== "manual") return;
          const raw = Math.round((p.x - bpX) / ROOM_W);
          const [d1, d2] = this.dividers;
          const clamped = this.draggingDiv === 0
            ? Math.max(1, Math.min(d2 - 1, raw))
            : Math.max(d1 + 1, Math.min(N - 1, raw));
          if (clamped !== this.dividers[this.draggingDiv]) {
            this.dividers[this.draggingDiv] = clamped;
            this.refreshDividers();
            this.refreshTints();
          }
        }

        // ── PHASE 1 ───────────────────────────────────────────────────────────────

        goPhase1() {
          this.clearPhase();
          this.phase = "manual";
          emitToolUsed("Manual Split", "O(n·k)");
          this.refreshTints();
          this.refreshDividers();

          const btn = this.makeBtn(W / 2, H - 34, "[ LOCK IN SPLIT ]", "#eab308", "#1a1800", () => this.submitManual());
          const hint = this.add.text(W / 2, H - 12, "DRAG THE YELLOW DIVIDERS  ◆  ASSIGN ROOMS TO 3 TEAMS", {
            fontFamily: "monospace", fontSize: "8px", color: "#2a2a2a",
          }).setOrigin(0.5).setDepth(8);
          this.phaseObjs.push(btn, hint);
        }

        submitManual() {
          if (solvedRef.current || this.simRunning) return;
          const [d1, d2] = this.dividers;
          const spans: [number, number][] = [[0, d1], [d1, d2], [d2, N]];
          const sums = spans.map(([s, e]) => ROOMS.slice(s, e).reduce((a, b) => a + b, 0));
          const bn = Math.max(...sums);
          this.totalAttempts++;
          this.manualAttempts++;
          onAttempt();
          this.addAnxiety(8);
          this.addLog(`#${this.totalAttempts} BN=${bn} [split]`, bn <= OPTIMAL ? "#22c55e" : bn <= OPTIMAL * 1.2 ? "#eab308" : "#ef4444");
          playSound("beep");

          if (bn === OPTIMAL) {
            this.addLog("→ OPTIMAL!", "#22c55e");
            emitReaction("BURST", `OPTIMAL: ${bn}`, W / 2, roomsTop + ROOM_H / 2);
            playSound("solve");
            solvedRef.current = true;
            this.time.delayedCall(600, () => this.showVictory());
            return;
          }

          const teamIdx = sums.indexOf(bn);
          if (bn > OPTIMAL * 1.5) {
            emitReaction("DANGER", `TEAM ${teamIdx + 1} OVERLOADED`, bpX + N * ROOM_W / 2, roomsTop + ROOM_H / 2);
          } else if (bn <= OPTIMAL * 1.2) {
            emitReaction("SLIDE_LEFT", "CLOSE — PUSH HARDER", W / 2, roomsTop + ROOM_H / 2);
          }

          if (this.manualAttempts === 3) {
            this.time.delayedCall(700, () => this.unlockTool("FEASIBILITY CHECK UNLOCKED", "#22c55e", "feasibility"));
          }
        }

        // ── PHASE 2 ───────────────────────────────────────────────────────────────

        goPhase2() {
          if (this.phase === "feasibility") return;
          this.clearPhase();
          this.phase = "feasibility";
          emitToolUsed("Feasibility Check", "O(n)");

          let target = Math.round((MAX_ROOM + SUM) / 2);

          const lbl = this.add.text(W / 2, H - 72, `CAN 3 TEAMS HANDLE MAX HEAT ≤`, {
            fontFamily: "monospace", fontSize: "10px", color: "#888",
          }).setOrigin(0.5).setDepth(8);

          const decBtn = this.makeBtn(W / 2 - 56, H - 46, "[-]", "#555", "#111", () => { target = Math.max(MAX_ROOM, target - 1); valTxt.setText(String(target)); });
          const valTxt = this.add.text(W / 2, H - 46, String(target), {
            fontFamily: "monospace", fontSize: "18px", color: "#eab308", fontStyle: "bold",
          }).setOrigin(0.5).setDepth(8);
          const incBtn = this.makeBtn(W / 2 + 56, H - 46, "[+]", "#555", "#111", () => { target = Math.min(SUM, target + 1); valTxt.setText(String(target)); });
          const simBtn = this.makeBtn(W / 2 + 138, H - 46, "[ SIMULATE ]", "#3b82f6", "#060e1a", () => {
            if (!this.simRunning) this.runFeasibility(target);
          });

          this.phaseObjs.push(lbl, decBtn, valTxt, incBtn, simBtn);
        }

        runFeasibility(target: number) {
          this.simRunning = true;
          this.totalAttempts++;
          this.feasibilityAttempts++;
          onAttempt();
          this.addAnxiety(5);
          emitToolUsed("Feasibility Check", "O(n)");
          playSound("click");

          this.animateGreedy(target, (feasible) => {
            this.addLog(`#${this.totalAttempts} ≤${target}: ${feasible ? "FEASIBLE ✓" : "NOT FEASIBLE ✗"}`, feasible ? "#22c55e" : "#ef4444");
            if (feasible) emitReaction("SLIDE_LEFT", `≤${target} ✓`, W / 2, roomsTop + ROOM_H / 2);
            else emitReaction("DANGER", `≤${target} ✗`, W / 2, roomsTop + ROOM_H / 2);
            playSound(feasible ? "correct" : "wrong");
            this.simRunning = false;
            if (this.feasibilityAttempts >= 3 && this.phase === "feasibility") {
              this.time.delayedCall(900, () => this.unlockTool("BINARY SEARCH MODE UNLOCKED", "#a855f7", "binary"));
            }
          });
        }

        // ── PHASE 3 ───────────────────────────────────────────────────────────────

        goPhase3() {
          if (this.phase === "binary") return;
          this.clearPhase();
          this.phase = "binary";
          this.bsLow = MAX_ROOM;
          this.bsHigh = SUM;
          this.bsHistory = [];
          emitToolUsed("Binary Search", "O(n log(sum))");
          this.nlGfx.setAlpha(1);
          this.buildBsUI();
        }

        buildBsUI() {
          this.phaseObjs.filter(o => (o as Phaser.GameObjects.Text).text?.startsWith("[") || (o as Phaser.GameObjects.Text).text?.startsWith("LO") || (o as Phaser.GameObjects.Text).text?.startsWith("HI") || (o as Phaser.GameObjects.Text).text?.startsWith("MID")).forEach(o => o.destroy());

          const mid = Math.floor((this.bsLow + this.bsHigh) / 2);
          const cx = W / 2;
          const row1 = H - 68;
          const row2 = H - 40;

          const loTxt = this.add.text(cx - 160, row1, `LOW: ${this.bsLow}`, { fontFamily: "monospace", fontSize: "12px", color: "#22c55e" }).setOrigin(0.5).setDepth(8);
          const hiTxt = this.add.text(cx, row1, `HIGH: ${this.bsHigh}`, { fontFamily: "monospace", fontSize: "12px", color: "#ef4444" }).setOrigin(0.5).setDepth(8);
          const midTxt = this.add.text(cx + 160, row1, `MID: ${mid}`, { fontFamily: "monospace", fontSize: "12px", color: "#eab308", fontStyle: "bold" }).setOrigin(0.5).setDepth(8);

          const converged = this.bsLow >= this.bsHigh;
          const testBtn = this.makeBtn(cx, row2, converged ? `[ CONFIRM ANSWER: ${this.bsLow} ]` : `[ TEST MID = ${mid} ]`, converged ? "#22c55e" : "#eab308", converged ? "#001a0a" : "#1a1800", () => {
            if (!this.simRunning) {
              if (converged) this.solveBs();
              else this.runBsStep();
            }
          });

          this.phaseObjs.push(loTxt, hiTxt, midTxt, testBtn);
          this.refreshNl();
        }

        runBsStep() {
          if (this.simRunning) return;
          this.simRunning = true;
          const mid = Math.floor((this.bsLow + this.bsHigh) / 2);
          this.totalAttempts++;
          this.binaryAttempts++;
          onAttempt();
          this.addAnxiety(3);
          emitToolUsed("Binary Search", "O(n log(sum))");
          playSound("beep");

          this.animateGreedy(mid, (feasible) => {
            this.bsHistory.push({ mid, feasible });
            if (feasible) { this.bsHigh = mid; emitReaction("SLIDE_LEFT", `≤${mid} ✓ → LOWER`, W / 2, roomsTop + ROOM_H / 2); playSound("correct"); }
            else { this.bsLow = mid + 1; emitReaction("SLIDE_RIGHT", `≤${mid} ✗ → HIGHER`, W / 2, roomsTop + ROOM_H / 2); playSound("beep"); }

            this.addLog(`#${this.totalAttempts} BS mid=${mid}: ${feasible ? "✓" : "✗"}`, feasible ? "#22c55e" : "#ef4444");
            this.simRunning = false;

            // Rebuild UI with updated values
            this.phaseObjs.forEach(o => o.destroy());
            this.phaseObjs = [];
            this.buildBsUI();

            if (this.bsLow >= this.bsHigh) {
              this.time.delayedCall(400, () => this.solveBs());
            }
          });
        }

        solveBs() {
          if (solvedRef.current) return;
          solvedRef.current = true;
          const answer = this.bsLow;
          playSound("solve");
          emitReaction("BURST", `ANSWER: ${answer}`, W / 2, roomsTop + ROOM_H / 2);
          const flash = this.add.text(W / 2, roomsTop + ROOM_H / 2, `MINIMUM BOTTLENECK = ${answer}`, {
            fontFamily: "monospace", fontSize: "16px", color: "#22c55e",
            backgroundColor: "#001a0a", padding: { x: 16, y: 10 },
          }).setOrigin(0.5).setDepth(22).setAlpha(0);
          this.tweens.add({ targets: flash, alpha: 1, duration: 400, onComplete: () => {
            this.time.delayedCall(900, () => this.showVictory());
          }});
        }

        // ── GREEDY ANIMATION ──────────────────────────────────────────────────────

        animateGreedy(target: number, done: (feasible: boolean) => void) {
          // Temporary flash graphics (tracked for cleanup)
          const flashes: Phaser.GameObjects.Graphics[] = [];
          let teamIdx = 0, curHeat = 0, roomIdx = 0;

          const step = () => {
            if (roomIdx >= N) {
              // All rooms assigned — feasible
              this.time.delayedCall(400, () => {
                flashes.forEach(f => { this.tweens.add({ targets: f, alpha: 0, duration: 600, onComplete: () => f.destroy() }); });
                this.refreshTints();
                done(true);
              });
              return;
            }

            const heat = ROOMS[roomIdx];
            if (curHeat + heat > target) {
              teamIdx++;
              curHeat = heat;
              if (teamIdx >= K) {
                // Not feasible
                const failGfx = this.add.graphics().setDepth(7);
                failGfx.fillStyle(0xcc0000, 0.5);
                failGfx.fillRect(bpX + roomIdx * ROOM_W, roomsTop, ROOM_W, ROOM_H);
                flashes.push(failGfx);
                this.time.delayedCall(600, () => {
                  flashes.forEach(f => { this.tweens.add({ targets: f, alpha: 0, duration: 600, onComplete: () => f.destroy() }); });
                  this.refreshTints();
                  done(false);
                });
                return;
              }
            } else {
              curHeat += heat;
            }

            const flash = this.add.graphics().setDepth(7);
            flash.fillStyle(TEAM_COLORS[Math.min(teamIdx, K - 1)], 0.5);
            flash.fillRect(bpX + roomIdx * ROOM_W, roomsTop, ROOM_W, ROOM_H);
            flashes.push(flash);
            roomIdx++;
            this.time.delayedCall(200, step);
          };

          step();
        }

        // ── NUMBER LINE ───────────────────────────────────────────────────────────

        refreshNl() {
          this.nlTexts.forEach(t => t.destroy());
          this.nlTexts = [];
          const g = this.nlGfx;
          g.clear();

          const nlX = bpX - bpPad;
          const nlW = bpW;
          const range = SUM - MAX_ROOM;
          if (range <= 0) return;

          const toX = (v: number) => nlX + ((v - MAX_ROOM) / range) * nlW;

          g.lineStyle(2, 0x2a2a2a, 1);
          g.lineBetween(nlX, NL_Y, nlX + nlW, NL_Y);

          // Color zones from history
          const feasHi = this.bsHistory.filter(h => h.feasible).map(h => h.mid);
          const notLo = this.bsHistory.filter(h => !h.feasible).map(h => h.mid);
          if (notLo.length) { g.fillStyle(0xef4444, 0.2); g.fillRect(nlX, NL_Y - 8, toX(Math.max(...notLo)) - nlX, 16); }
          if (feasHi.length) { g.fillStyle(0x22c55e, 0.2); g.fillRect(toX(Math.min(...feasHi)), NL_Y - 8, nlX + nlW - toX(Math.min(...feasHi)), 16); }

          // History dots
          for (const h of this.bsHistory) { g.fillStyle(h.feasible ? 0x22c55e : 0xef4444, 0.9); g.fillCircle(toX(h.mid), NL_Y, 5); }

          // LOW / HIGH markers
          g.lineStyle(2, 0x22c55e, 1); g.lineBetween(toX(this.bsLow), NL_Y - 12, toX(this.bsLow), NL_Y + 12);
          g.lineStyle(2, 0xef4444, 1); g.lineBetween(toX(this.bsHigh), NL_Y - 12, toX(this.bsHigh), NL_Y + 12);

          if (this.bsLow < this.bsHigh) {
            const mid = Math.floor((this.bsLow + this.bsHigh) / 2);
            g.lineStyle(2, 0xeab308, 1); g.lineBetween(toX(mid), NL_Y - 10, toX(mid), NL_Y + 10);
            const mTxt = this.add.text(toX(mid), NL_Y + 14, `${mid}`, { fontFamily: "monospace", fontSize: "7px", color: "#eab308" }).setOrigin(0.5, 0).setDepth(5);
            this.nlTexts.push(mTxt);
          }

          const loTxt2 = this.add.text(toX(this.bsLow), NL_Y - 16, `${this.bsLow}`, { fontFamily: "monospace", fontSize: "7px", color: "#22c55e" }).setOrigin(0.5, 1).setDepth(5);
          const hiTxt2 = this.add.text(toX(this.bsHigh), NL_Y - 16, `${this.bsHigh}`, { fontFamily: "monospace", fontSize: "7px", color: "#ef4444" }).setOrigin(0.5, 1).setDepth(5);
          const minLbl = this.add.text(toX(MAX_ROOM), NL_Y + 14, `min\n${MAX_ROOM}`, { fontFamily: "monospace", fontSize: "7px", color: "#555" }).setOrigin(0.5, 0).setDepth(5);
          const maxLbl = this.add.text(toX(SUM), NL_Y + 14, `max\n${SUM}`, { fontFamily: "monospace", fontSize: "7px", color: "#555" }).setOrigin(1, 0).setDepth(5);
          this.nlTexts.push(loTxt2, hiTxt2, minLbl, maxLbl);
        }

        // ── UTILS ──────────────────────────────────────────────────────────────────

        makeBtn(x: number, y: number, label: string, color: string, bg: string, cb: () => void): Phaser.GameObjects.Text {
          const btn = this.add.text(x, y, label, {
            fontFamily: "monospace", fontSize: "12px", color,
            backgroundColor: bg, padding: { x: 12, y: 6 },
          }).setOrigin(0.5).setDepth(8).setInteractive({ cursor: "pointer" });
          btn.on("pointerdown", cb);
          btn.on("pointerover", () => btn.setAlpha(0.8));
          btn.on("pointerout", () => btn.setAlpha(1));
          return btn;
        }

        clearPhase() {
          this.phaseObjs.forEach(o => { if (o?.active) o.destroy(); });
          this.phaseObjs = [];
          this.nlGfx?.setAlpha(0);
          this.nlTexts.forEach(t => t.destroy());
          this.nlTexts = [];
        }

        unlockTool(msg: string, color: string, _phase: string) {
          const flash = this.add.text(W / 2, H / 2 - 36, `🔓 ${msg}`, {
            fontFamily: "monospace", fontSize: "13px", color,
            backgroundColor: color === "#22c55e" ? "#001a0a" : "#0d0018",
            padding: { x: 14, y: 8 },
          }).setOrigin(0.5).setDepth(22).setAlpha(0);
          this.tweens.add({
            targets: flash, alpha: 1, duration: 300, yoyo: false,
            onComplete: () => this.time.delayedCall(2000, () => {
              this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
            }),
          });
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("bs-phase-unlock", { detail: { phase: _phase } }));
        }

        // ── VICTORY ────────────────────────────────────────────────────────────────

        showVictory() {
          this.clearPhase();
          // Glow the blueprint
          const glow = this.add.graphics().setDepth(8);
          glow.lineStyle(4, 0xfbbf24, 0.9);
          glow.strokeRect(bpX - bpPad, bpY - bpPad, bpW, bpH + bpPad);
          this.tweens.add({ targets: glow, alpha: 0.3, duration: 600, yoyo: true, repeat: 2 });

          this.time.delayedCall(1400, () => {
            const ov = this.add.graphics().setDepth(20);
            ov.fillStyle(0x000000, 0.88);
            ov.fillRect(0, 0, W, H);

            const cy = H / 2 - 90;
            this.add.text(W / 2, cy, "HEIST COMPLETE", { fontFamily: "monospace", fontSize: "22px", color: "#fbbf24", fontStyle: "bold" }).setOrigin(0.5).setDepth(21);
            this.add.text(W / 2, cy + 30, `MINIMUM BOTTLENECK: ${OPTIMAL}`, { fontFamily: "monospace", fontSize: "13px", color: "#22c55e" }).setOrigin(0.5).setDepth(21);

            const optBs = Math.max(1, Math.ceil(Math.log2(SUM - MAX_ROOM + 2)));
            const stats = [
              ["Phase 1 — Manual drag", `${this.manualAttempts}`],
              ["Phase 2 — Feasibility", `${this.feasibilityAttempts}`],
              ["Phase 3 — Binary search", `${this.binaryAttempts}`],
              ["Total attempts", `${this.totalAttempts}`],
              [`Optimal binary needs`, `~${optBs} checks`],
            ];
            stats.forEach(([k, v], i) => {
              this.add.text(W / 2 - 120, cy + 60 + i * 20, k, { fontFamily: "monospace", fontSize: "10px", color: "#555" }).setDepth(21);
              this.add.text(W / 2 + 120, cy + 60 + i * 20, v, { fontFamily: "monospace", fontSize: "10px", color: "#aaa" }).setOrigin(1, 0).setDepth(21);
            });

            const rooms = ROOMS.join(", ");
            this.add.text(W / 2, cy + 170, `ARRAY: [${rooms}]  K=3`, { fontFamily: "monospace", fontSize: "9px", color: "#333" }).setOrigin(0.5).setDepth(21);

            const continueBtn = this.makeBtn(W / 2, cy + 196, "[ MISSION DEBRIEF → ]", "#a855f7", "#0d001a", () => onSolve());
            continueBtn.setDepth(22);
            this.phaseObjs.push(continueBtn);
          });
        }

        showAbort() {
          if (solvedRef.current) return;
          const ov = this.add.graphics().setDepth(20);
          ov.fillStyle(0x000000, 0.85);
          ov.fillRect(0, 0, W, H);
          this.add.text(W / 2, H / 2 - 28, "CREW WALKED — MISSION ABORT", { fontFamily: "monospace", fontSize: "14px", color: "#ef4444" }).setOrigin(0.5).setDepth(21);
          this.add.text(W / 2, H / 2 - 6, `Manual guessing can't beat binary search on [${MAX_ROOM}, ${SUM}].`, { fontFamily: "monospace", fontSize: "9px", color: "#555" }).setOrigin(0.5).setDepth(21);
          const btn = this.makeBtn(W / 2, H / 2 + 22, "[ RETRY ]", "#a855f7", "#0d001a", () => { solvedRef.current = false; this.scene.restart(); });
          btn.setDepth(22);
        }
      }

      if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; }
      const g = new Phaser.Game({
        type: Phaser.AUTO, width: W, height: H,
        parent: containerRef.current!, backgroundColor: "#0a0a08",
        scene: HeistScene, render: { antialias: true },
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
