import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';
import { GameState } from '../engine/GameState';

const N = 16;
const TIMER_TOTAL = 60;

function genArray(): { arr: number[]; target: number } {
  const arr = Array.from({ length: N }, (_, i) => (i + 1) * 7 + Math.floor(Math.random() * 6));
  const target = arr[Math.floor(Math.random() * N)];
  return { arr, target };
}

export class Mission1Scene extends Phaser.Scene {
  private W = 800; private H = 600;
  private arr: number[] = [];
  private target = 0;
  private left = 0; private right = N - 1;
  private eliminated = new Set<number>();
  private blocks: Phaser.GameObjects.Container[] = [];
  private blockBgs: Phaser.GameObjects.Graphics[] = [];
  private blockLabels: Phaser.GameObjects.Text[] = [];
  private timerLeft = TIMER_TOTAL;
  private timerText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Graphics;
  private scanBeam!: Phaser.GameObjects.Graphics;
  private kaiG!: Phaser.GameObjects.Graphics;
  private drones: Phaser.GameObjects.Container[] = [];
  private droneSpawnedAt30 = false;
  private droneSpawnedAt15 = false;
  private busy = false;
  private checks = 0;
  private timerEvent!: Phaser.Time.TimerEvent;
  private unsubs: (() => void)[] = [];
  private kaiX = 80;
  private kaiY = 0;

  constructor() { super({ key: 'Mission1Scene' }); }

  create(): void {
    this.W = this.scale.width; this.H = this.scale.height;
    const { arr, target } = genArray();
    this.arr = arr; this.target = target;
    this.left = 0; this.right = N - 1;
    this.eliminated.clear();
    this.checks = 0;
    this.blocks = []; this.blockBgs = []; this.blockLabels = [];
    this.drones = []; this.droneSpawnedAt30 = false; this.droneSpawnedAt15 = false;
    this.timerLeft = TIMER_TOTAL; this.busy = false;
    this.kaiY = this.H * 0.65;

    this.buildBackground();
    this.buildHUD();
    this.buildBlocks();
    this.buildKai();
    this.buildScanBeam();
    this.startTimer();
    this.wireInput();
    this.wireReactEvents();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    EventBus.emit('sound:state', { state: 'SCANNING' });
  }

  private buildBackground(): void {
    const bg = this.add.graphics();
    for (let i = 0; i < this.H; i += 3) {
      bg.fillStyle(0x000511, 1);
      bg.fillRect(0, i, this.W, 3);
    }
    // Circuit pattern on walls
    bg.lineStyle(0.5, 0x001133, 0.6);
    for (let x = 0; x < this.W; x += 40) bg.lineBetween(x, 0, x, this.H);
    for (let y = 0; y < this.H; y += 40) bg.lineBetween(0, y, this.W, y);
    // Vault floor glow
    bg.fillStyle(0x0a1628, 1);
    bg.fillRect(0, this.H * 0.72, this.W, this.H * 0.28);
  }

  private buildHUD(): void {
    // Target panel
    const targetPanel = this.add.graphics().setDepth(10);
    targetPanel.fillStyle(0x0d1a2e, 0.9);
    targetPanel.fillRoundedRect(this.W / 2 - 80, 10, 160, 36, 4);
    targetPanel.lineStyle(1, 0x3b82f6, 0.8);
    targetPanel.strokeRoundedRect(this.W / 2 - 80, 10, 160, 36, 4);

    this.add.text(this.W / 2, 28, `TARGET: ${this.target}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#60a5fa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // Pulse animation on target panel
    this.tweens.add({
      targets: targetPanel,
      alpha: 0.7,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Timer
    this.timerBar = this.add.graphics().setDepth(10);
    this.timerText = this.add.text(this.W - 12, 14, `${this.timerLeft}s`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#3b82f6',
    }).setOrigin(1, 0).setDepth(11);

    // Mission label
    this.add.text(12, 14, 'M1 · THE VAULT HEIST', {
      fontFamily: 'monospace', fontSize: '9px', color: '#1d4ed8',
    }).setDepth(10);
  }

  private buildBlocks(): void {
    const slotW = Math.min(56, Math.floor((this.W - 40) / N));
    const slotH = 70;
    const totalW = N * slotW;
    const startX = (this.W - totalW) / 2;
    const baseY = this.H * 0.45;

    for (let i = 0; i < N; i++) {
      const cx = startX + i * slotW + slotW / 2;
      const c = this.add.container(cx, baseY);

      const bg = this.add.graphics();
      bg.fillStyle(0x0a1628, 1);
      bg.fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
      bg.lineStyle(1, 0x1a3a6e, 1);
      bg.strokeRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);

      const lbl = this.add.text(0, 0, '?', {
        fontFamily: 'monospace', fontSize: '11px', color: '#1a3a6e',
      }).setOrigin(0.5);

      const idxLbl = this.add.text(0, slotH / 2 + 6, String(i + 1), {
        fontFamily: 'monospace', fontSize: '8px', color: '#0f1e3a',
      }).setOrigin(0.5, 0);

      c.add([bg, lbl, idxLbl]);
      c.setSize(slotW, slotH);
      c.setInteractive({ useHandCursor: true });
      c.setDepth(5);

      // Idle float animation (staggered)
      this.tweens.add({
        targets: c,
        y: baseY - 4,
        duration: 1200 + i * 40,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.blocks.push(c);
      this.blockBgs.push(bg);
      this.blockLabels.push(lbl);

      c.on('pointerdown', () => this.onBlockClick(i));
      c.on('pointerover', () => {
        if (this.eliminated.has(i)) return;
        bg.clear();
        bg.fillStyle(0x1a3060, 1);
        bg.fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
        bg.lineStyle(1.5, 0x3b82f6, 0.8);
        bg.strokeRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
      });
      c.on('pointerout', () => {
        if (this.eliminated.has(i)) return;
        bg.clear();
        bg.fillStyle(0x0a1628, 1);
        bg.fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
        bg.lineStyle(1, 0x1a3a6e, 1);
        bg.strokeRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
      });
    }
  }

  private buildKai(): void {
    this.kaiG = this.add.graphics().setDepth(6);
    this.drawKai();
  }

  private drawKai(): void {
    this.kaiG.clear();
    const x = this.kaiX, y = this.kaiY;
    // shadow
    this.kaiG.fillStyle(0x3b82f6, 0.08);
    this.kaiG.fillEllipse(x, y + 18, 30, 8);
    // legs
    this.kaiG.fillStyle(0x111827);
    this.kaiG.fillRect(x - 7, y + 6, 5, 9);
    this.kaiG.fillRect(x + 2, y + 6, 5, 9);
    // body
    this.kaiG.fillRect(x - 8, y - 8, 16, 15);
    // arms
    this.kaiG.fillRect(x - 13, y - 7, 5, 11);
    this.kaiG.fillRect(x + 8, y - 7, 5, 11);
    // shoulder accents
    this.kaiG.fillStyle(0x3b82f6);
    this.kaiG.fillRect(x - 8, y - 8, 3, 2);
    this.kaiG.fillRect(x + 5, y - 8, 3, 2);
    // head
    this.kaiG.fillStyle(0x1e293b);
    this.kaiG.fillRect(x - 7, y - 20, 14, 13);
    // visor
    this.kaiG.fillStyle(0x3b82f6);
    this.kaiG.fillRect(x - 5, y - 17, 10, 5);
    // antenna
    this.kaiG.fillStyle(0x60a5fa);
    this.kaiG.fillRect(x - 1, y - 27, 2, 8);
    this.kaiG.fillCircle(x, y - 27, 2.5);
  }

  private buildScanBeam(): void {
    this.scanBeam = this.add.graphics().setDepth(4);
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timerLeft--;
        this.updateTimerHUD();
        if (this.timerLeft === 30 && !this.droneSpawnedAt30) {
          this.droneSpawnedAt30 = true;
          this.spawnDrone();
          EventBus.emit('reaction:slide', { text: '⚠ SECURITY DRONE INCOMING', color: '#f97316' });
          EventBus.emit('sound:state', { state: 'TENSION' });
        }
        if (this.timerLeft === 15 && !this.droneSpawnedAt15) {
          this.droneSpawnedAt15 = true;
          this.spawnDrone();
          EventBus.emit('reaction:danger', { text: 'SECOND DRONE — CRITICAL ALERT' });
          EventBus.emit('sound:state', { state: 'CRITICAL' });
        }
        if (this.timerLeft <= 0) this.triggerDeath('Timer expired — drones reached Kai');
      },
      loop: true,
    });
  }

  private updateTimerHUD(): void {
    const t = this.timerLeft;
    const color = t > 30 ? '#3b82f6' : t > 15 ? '#f97316' : '#ef4444';
    this.timerText.setText(`${t}s`).setStyle({ color });
    this.timerBar.clear();
    const barW = 80;
    const ratio = t / TIMER_TOTAL;
    const col = t > 30 ? 0x3b82f6 : t > 15 ? 0xf97316 : 0xef4444;
    this.timerBar.fillStyle(0x111111);
    this.timerBar.fillRect(this.W - barW - 12, 28, barW, 5);
    this.timerBar.fillStyle(col, 0.8);
    this.timerBar.fillRect(this.W - barW - 12, 28, barW * ratio, 5);
    this.timerBar.setDepth(10);
  }

  private spawnDrone(): void {
    const g = this.add.graphics();
    const y = this.H * 0.3 + this.drones.length * 40;
    // Drone body
    g.fillStyle(0x1a0000);
    g.fillRect(-20, -8, 40, 16);
    g.lineStyle(1.5, 0xef4444, 0.9);
    g.strokeRect(-20, -8, 40, 16);
    g.fillStyle(0xff0000, 0.8);
    g.fillCircle(-14, 0, 4);
    g.fillCircle(14, 0, 4);
    g.fillRect(-2, -3, 4, 6);

    const c = this.add.container(this.W + 60, y).setDepth(8);
    (c as unknown as Phaser.GameObjects.Container & { body: unknown }).add?.(g) ?? c.add(g);

    EventBus.emit('sound:effect', { name: 'drone_buzz' });

    // Drone flies in and hovers
    this.tweens.add({
      targets: c,
      x: this.W * 0.8 - this.drones.length * 60,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => {
        // Slow advance toward Kai
        this.tweens.add({
          targets: c,
          x: this.kaiX + 80,
          duration: (this.timerLeft - 2) * 1000,
          ease: 'Linear',
        });
      },
    });

    this.drones.push(c);
  }

  private wireInput(): void {
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.busy) return;
      this.scanBeam.clear();
      this.scanBeam.lineStyle(1.5, 0x3b82f6, 0.3);
      const from = this.add.graphics();
      this.scanBeam.lineBetween(this.kaiX + 10, this.kaiY - 10, ptr.x, ptr.y);
      from.destroy();
    });
  }

  private wireReactEvents(): void {
    this.unsubs.push(
      EventBus.on('game:retry', () => this.scene.restart()),
    );
  }

  private onBlockClick(i: number): void {
    if (this.busy || this.eliminated.has(i)) return;
    this.busy = true;
    this.checks++;

    EventBus.emit('sound:effect', { name: 'beam_fire' });

    // Beam fire animation
    const tx = (this.blocks[i] as Phaser.GameObjects.Container).x;
    const ty = (this.blocks[i] as Phaser.GameObjects.Container).y;
    this.scanBeam.clear();

    const progress = { t: 0 };
    this.tweens.add({
      targets: progress,
      t: 1,
      duration: 200,
      onUpdate: () => {
        this.scanBeam.clear();
        const px = Phaser.Math.Linear(this.kaiX + 10, tx, progress.t);
        const py = Phaser.Math.Linear(this.kaiY - 10, ty, progress.t);
        this.scanBeam.lineStyle(2, 0x3b82f6, 0.8 * (1 - progress.t * 0.3));
        this.scanBeam.lineBetween(this.kaiX + 10, this.kaiY - 10, px, py);
        // Particle trail
        EventBus.emit('particle:explosion', { x: px, y: py, type: 'DATA_STREAM', intensity: 0.2 });
      },
      onComplete: () => {
        this.scanBeam.clear();
        this.revealBlock(i);
      },
    });
  }

  private revealBlock(i: number): void {
    const val = this.arr[i];
    const slotW = Math.min(56, Math.floor((this.W - 40) / N));
    const slotH = 70;

    // Impact flash
    this.blockBgs[i].clear();
    this.blockBgs[i].fillStyle(0xffffff, 1);
    this.blockBgs[i].fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);

    EventBus.emit('particle:explosion', {
      x: (this.blocks[i] as Phaser.GameObjects.Container).x,
      y: (this.blocks[i] as Phaser.GameObjects.Container).y,
      type: 'SPARKS', intensity: 0.6,
    });

    this.time.delayedCall(150, () => {
      // Show value
      this.blockLabels[i].setText(String(val)).setStyle({ color: '#60a5fa', fontSize: '12px' });
      this.blockBgs[i].clear();
      this.blockBgs[i].fillStyle(0x0d2244, 1);
      this.blockBgs[i].fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
      this.blockBgs[i].lineStyle(1.5, 0x3b82f6, 0.9);
      this.blockBgs[i].strokeRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);

      this.time.delayedCall(250, () => this.evaluate(i, val));
    });
  }

  private evaluate(i: number, val: number): void {
    const cx = (this.blocks[i] as Phaser.GameObjects.Container).x;
    const cy = (this.blocks[i] as Phaser.GameObjects.Container).y;

    if (val === this.target) {
      this.triggerVictory(i);
      return;
    }

    const goRight = val < this.target;
    const toElim = goRight
      ? Array.from({ length: i - this.left + 1 }, (_, k) => this.left + k)
      : Array.from({ length: this.right - i + 1 }, (_, k) => i + k);

    const arrowText = goRight ? '→ SEARCH RIGHT' : '← SEARCH LEFT';
    const arrowColor = '#eab308';
    EventBus.emit('reaction:burst', { x: cx, y: cy - 50, text: arrowText, color: arrowColor });
    EventBus.emit('sound:effect', { name: 'explosion_small' });

    // Chain elimination
    let delay = 0;
    for (const idx of toElim) {
      this.time.delayedCall(delay, () => this.eliminateBlock(idx, goRight));
      delay += 60;
    }

    this.time.delayedCall(delay + 400, () => {
      if (goRight) this.left = i + 1;
      else this.right = i - 1;
      this.slideBlocks(() => { this.busy = false; });
    });
  }

  private eliminateBlock(i: number, _toRight: boolean): void {
    this.eliminated.add(i);
    const slotW = Math.min(56, Math.floor((this.W - 40) / N));
    const slotH = 70;
    const block = this.blocks[i] as Phaser.GameObjects.Container;

    EventBus.emit('particle:explosion', {
      x: block.x, y: block.y,
      type: 'EXPLOSION_DATA', intensity: 0.5,
    });

    this.tweens.add({
      targets: block,
      y: block.y - 60,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
    });
    EventBus.emit('sound:effect', { name: 'explosion_small' });
  }

  private slideBlocks(_done: () => void): void {
    const slotW = Math.min(56, Math.floor((this.W - 40) / N));
    const active = Array.from({ length: N }, (_, i) => i).filter(i => !this.eliminated.has(i));
    const count = active.length;
    const totalW = count * slotW;
    const startX = (this.W - totalW) / 2;

    active.forEach((idx, j) => {
      const newX = startX + j * slotW + slotW / 2;
      this.tweens.add({
        targets: this.blocks[idx],
        x: newX,
        duration: 300,
        ease: 'Power2',
        onComplete: j === active.length - 1 ? () => { this.busy = false; } : undefined,
      });
    });
    if (active.length === 0) this.busy = false;
  }

  private triggerVictory(i: number): void {
    this.timerEvent.destroy();
    EventBus.emit('sound:state', { state: 'VICTORY' });
    EventBus.emit('sound:effect', { name: 'victory_sting' });
    EventBus.emit('reaction:burst', {
      x: (this.blocks[i] as Phaser.GameObjects.Container).x,
      y: (this.blocks[i] as Phaser.GameObjects.Container).y - 40,
      text: '⚡ TARGET ACQUIRED', color: '#eab308',
    });

    // Time freeze
    this.time.timeScale = 0.15;

    // Gold burst
    EventBus.emit('particle:explosion', {
      x: (this.blocks[i] as Phaser.GameObjects.Container).x,
      y: (this.blocks[i] as Phaser.GameObjects.Container).y,
      type: 'GOLD_BURST', intensity: 1.5,
    });

    const slotW = Math.min(56, Math.floor((this.W - 40) / N));
    const slotH = 70;
    this.blockBgs[i].clear();
    this.blockBgs[i].fillStyle(0x1a1000, 1);
    this.blockBgs[i].fillRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);
    this.blockBgs[i].lineStyle(2, 0xeab308, 1);
    this.blockBgs[i].strokeRoundedRect(-slotW / 2 + 1, -slotH / 2, slotW - 2, slotH, 4);

    this.time.delayedCall(800, () => {
      this.time.timeScale = 1;
      // Explode all other blocks
      let delay = 0;
      for (let j = 0; j < N; j++) {
        if (j === i || this.eliminated.has(j)) continue;
        this.time.delayedCall(delay, () => {
          EventBus.emit('particle:explosion', {
            x: (this.blocks[j] as Phaser.GameObjects.Container).x,
            y: (this.blocks[j] as Phaser.GameObjects.Container).y,
            type: 'EXPLOSION_DATA', intensity: 0.8,
          });
          this.tweens.add({ targets: this.blocks[j], alpha: 0, duration: 200 });
        });
        delay += 40;
      }
      EventBus.emit('sound:effect', { name: 'explosion_large' });

      this.time.delayedCall(delay + 600, () => {
        // Kai runs to target
        this.tweens.add({
          targets: this.kaiG,
          x: (this.blocks[i] as Phaser.GameObjects.Container).x - this.kaiX,
          duration: 800,
          ease: 'Power2',
          onComplete: () => {
            this.cameras.main.fadeOut(600, 0, 0, 0, () => this.showStats());
          },
        });
      });
    });
  }

  private showStats(): void {
    GameState.complete(1, {
      checks: this.checks,
      optimal: Math.ceil(Math.log2(N)),
    });
    EventBus.emit('scene:stats', {
      mission: 1,
      checks: this.checks,
      optimal: Math.ceil(Math.log2(N)),
      title: 'BINARY SEARCH',
      insight: [
        'Every shot eliminated HALF the vault.',
        `${N} blocks → ${N/2} → ${N/4} → ... → 1`,
        'This is Binary Search.',
        'Time complexity: O(log n)',
      ],
      extra: { timeLeft: this.timerLeft },
    });
  }

  private triggerDeath(reason: string): void {
    if (this.busy && this.timerLeft > 0) return;
    this.timerEvent?.destroy();
    EventBus.emit('sound:state', { state: 'DEATH' });
    this.cameras.main.shake(400, 0.025);
    this.cameras.main.fadeOut(800, 20, 0, 0, () => {
      EventBus.emit('scene:death', { mission: 1 });
    });
  }

  update(_t: number, _dt: number): void {
    // Keep kai redrawn if moved
    this.drawKai();
  }

  shutdown(): void {
    this.unsubs.forEach(u => u());
    this.timerEvent?.destroy();
  }
}
