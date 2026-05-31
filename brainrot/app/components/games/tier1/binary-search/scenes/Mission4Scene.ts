import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';
import { GameState } from '../engine/GameState';

const N = 14;
const MAX_CELLS = 5;

function makePeakHeights(): number[] {
  // Guarantee at least one peak (not edge)
  const heights: number[] = [];
  for (let i = 0; i < N; i++) heights.push(Phaser.Math.Between(30, 180));
  // Force a clear peak somewhere in 2..N-2
  const peakIdx = Phaser.Math.Between(2, N - 3);
  heights[peakIdx] = 210 + Phaser.Math.Between(0, 30);
  heights[peakIdx - 1] = Math.min(heights[peakIdx] - Phaser.Math.Between(20, 60), 170);
  heights[peakIdx + 1] = Math.min(heights[peakIdx] - Phaser.Math.Between(20, 60), 170);
  return heights;
}

export class Mission4Scene extends Phaser.Scene {
  private W = 800;
  private H = 600;

  private heights: number[] = [];
  private left = 0;
  private right = N - 1;
  private cells = MAX_CELLS;
  private checks = 0;
  private won = false;
  private dead = false;
  private scanning = false;

  private towerRects: Phaser.GameObjects.Container[] = [];
  private cellSegs: Phaser.GameObjects.Graphics[] = [];
  private scanBeam!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;

  // Highlight overlays
  private dimOverlay!: Phaser.GameObjects.Graphics;

  constructor() { super({ key: 'Mission4Scene' }); }

  create(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.heights = makePeakHeights();
    this.left = 0;
    this.right = N - 1;
    this.cells = MAX_CELLS;
    this.checks = 0;
    this.won = false;
    this.dead = false;
    this.scanning = false;
    this.towerRects = [];
    this.cellSegs = [];

    this.buildBackground();
    this.buildTowers();
    this.buildScanBeam();
    this.buildHUD();
    this.updateRangeHighlight();

    EventBus.emit('sound:state', { state: 'SCANNING' });
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private buildBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x040608, 1);
    bg.fillRect(0, 0, this.W, this.H);

    // Night sky gradient
    for (let y = 0; y < this.H * 0.55; y += 6) {
      const t = y / (this.H * 0.55);
      bg.fillStyle(0x000510, 0.04 + t * 0.03);
      bg.fillRect(0, y, this.W, 6);
    }

    // Stars
    for (let s = 0; s < 80; s++) {
      const sx = Phaser.Math.Between(0, this.W);
      const sy = Phaser.Math.Between(0, this.H * 0.4);
      bg.fillStyle(0xffffff, Math.random() * 0.3 + 0.05);
      bg.fillRect(sx, sy, 1, 1);
    }

    // Ground
    bg.fillStyle(0x080c10, 1);
    bg.fillRect(0, this.H * 0.72, this.W, this.H * 0.28);
    bg.lineStyle(1, 0x112244, 0.4);
    bg.lineBetween(0, this.H * 0.72, this.W, this.H * 0.72);

    // Catwalk grid lines
    for (let i = 0; i < 6; i++) {
      bg.lineStyle(0.5, 0x0a1020, 0.3);
      bg.lineBetween(0, this.H * 0.72 + i * 14, this.W, this.H * 0.72 + i * 14);
    }

    // Red static interference lines (dead signal aesthetic)
    for (let i = 0; i < 3; i++) {
      const y = Phaser.Math.Between(0, this.H);
      bg.lineStyle(0.5, 0x440000, 0.15);
      bg.lineBetween(0, y, this.W, y);
    }

    this.add.text(this.W / 2, this.H * 0.06, 'DEAD SIGNAL — FIND THE PEAK TOWER', {
      fontFamily: 'monospace', fontSize: '11px', color: '#330a0a',
    }).setOrigin(0.5).setDepth(10);
  }

  private buildTowers(): void {
    const floorY = this.H * 0.72;
    const TW = 44;
    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;

    // Dim overlay (for out-of-range towers)
    this.dimOverlay = this.add.graphics().setDepth(4);

    for (let i = 0; i < N; i++) {
      const tx = startX + i * spacing;
      const th = this.heights[i];
      const ty = floorY - th;

      const container = this.add.container(tx, floorY).setDepth(3);

      // Mountain silhouette body
      const body = this.add.graphics();
      const baseColor = 0x0d1520;
      const edgeColor = 0x1a2840;
      body.fillStyle(baseColor, 1);
      // Trapezoid mountain shape using triangle + rect
      body.fillTriangle(-TW / 2, 0, TW / 2, 0, 0, -th);
      body.lineStyle(1, edgeColor, 0.6);
      body.strokeTriangle(-TW / 2, 0, TW / 2, 0, 0, -th);

      // Antenna on top
      body.lineStyle(1, 0x223344, 0.5);
      body.lineBetween(0, -th, 0, -th - 18);
      body.fillStyle(0xff2200, 0.4);
      body.fillCircle(0, -th - 18, 3);

      // Height label
      const hLabel = this.add.text(0, -th - 28, `${th}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#1a2840',
      }).setOrigin(0.5);

      container.add([body, hLabel]);
      container.setData('index', i);
      container.setData('heightLabel', hLabel);
      container.setData('body', body);

      // Clickable hit area
      const hit = this.add.rectangle(tx, floorY - th / 2, TW, th, 0x000000, 0)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.onTowerClick(i));
      hit.on('pointerover', () => {
        if (i >= this.left && i <= this.right && !this.scanning && !this.won && !this.dead) {
          (container.getData('body') as Phaser.GameObjects.Graphics).setAlpha(0.7);
        }
      });
      hit.on('pointerout', () => {
        (container.getData('body') as Phaser.GameObjects.Graphics).setAlpha(1);
      });

      this.towerRects.push(container);
    }

    // L/R boundary arrows
    this.leftArrow = this.add.text(0, floorY + 8, '◄L', {
      fontFamily: 'monospace', fontSize: '9px', color: '#00ffff',
    }).setOrigin(0.5).setDepth(10);
    this.rightArrow = this.add.text(0, floorY + 8, 'R►', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff44ff',
    }).setOrigin(0.5).setDepth(10);
    this.refreshBoundaryArrows();
  }

  private refreshBoundaryArrows(): void {
    const floorY = this.H * 0.72;
    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;
    this.leftArrow.setPosition(startX + this.left * spacing, floorY + 10);
    this.rightArrow.setPosition(startX + this.right * spacing, floorY + 10);
  }

  private buildScanBeam(): void {
    this.scanBeam = this.add.graphics().setDepth(7);
  }

  private buildHUD(): void {
    // Power cells (top right)
    this.add.text(this.W - 130, 14, 'POWER CELLS', {
      fontFamily: 'monospace', fontSize: '8px', color: '#220a00',
    }).setDepth(10);
    for (let i = 0; i < MAX_CELLS; i++) {
      const seg = this.add.graphics().setDepth(10);
      seg.fillStyle(0xdd4400, 0.8);
      seg.fillRect(this.W - 130 + i * 24, 26, 20, 10);
      this.cellSegs.push(seg);
    }

    this.statusText = this.add.text(this.W / 2, this.H - 18, 'CLICK A TOWER TO SCAN ITS NEIGHBORS', {
      fontFamily: 'monospace', fontSize: '9px', color: '#220a00',
    }).setOrigin(0.5).setDepth(10);
  }

  private updateRangeHighlight(): void {
    this.dimOverlay.clear();
    // Dim out-of-range towers
    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;
    for (let i = 0; i < N; i++) {
      if (i < this.left || i > this.right) {
        const tx = startX + i * spacing;
        this.dimOverlay.fillStyle(0x000000, 0.65);
        this.dimOverlay.fillRect(tx - 25, 0, 50, this.H * 0.72);
      }
    }
  }

  private onTowerClick(index: number): void {
    if (this.scanning || this.won || this.dead) return;
    if (index < this.left || index > this.right) return;
    if (this.cells <= 0) return;

    this.scanning = true;
    this.checks++;
    this.cells--;

    // Deplete one power cell
    const spent = MAX_CELLS - this.cells;
    if (spent <= MAX_CELLS) {
      this.cellSegs[spent - 1].clear();
      this.cellSegs[spent - 1].fillStyle(0x1a0800, 0.4);
      this.cellSegs[spent - 1].fillRect(this.W - 130 + (spent - 1) * 24, 26, 20, 10);
    }

    const floorY = this.H * 0.72;
    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;
    const tx = startX + index * spacing;

    // Animate scan beam from bottom
    this.scanBeam.clear();
    this.scanBeam.lineStyle(2, 0xff6600, 0.9);
    this.scanBeam.lineBetween(tx, floorY, tx, floorY - this.heights[index]);

    this.tweens.add({
      targets: this.scanBeam,
      alpha: 0.3,
      duration: 250,
      yoyo: true,
      onComplete: () => {
        this.scanBeam.setAlpha(1);
        this.revealTower(index);
      },
    });
  }

  private revealTower(index: number): void {
    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;
    const floorY = this.H * 0.72;
    const tx = startX + index * spacing;
    const h = this.heights[index];

    const leftH = index > 0 ? this.heights[index - 1] : -1;
    const rightH = index < N - 1 ? this.heights[index + 1] : -1;

    // Show comparison beams
    const compG = this.add.graphics().setDepth(8);
    if (leftH >= 0) {
      const lx = startX + (index - 1) * spacing;
      compG.lineStyle(1, leftH > h ? 0xff4444 : 0x44ff44, 0.6);
      compG.lineBetween(lx, floorY - leftH, tx, floorY - h);
    }
    if (rightH >= 0) {
      const rx = startX + (index + 1) * spacing;
      compG.lineStyle(1, rightH > h ? 0xff4444 : 0x44ff44, 0.6);
      compG.lineBetween(rx, floorY - rightH, tx, floorY - h);
    }
    this.tweens.add({ targets: compG, alpha: 0, duration: 1200, onComplete: () => compG.destroy() });

    // Reveal height
    const hLabel = this.towerRects[index].getData('heightLabel') as Phaser.GameObjects.Text;
    hLabel.setStyle({ color: '#cc6622', fontSize: '9px' });

    // Peak test
    const isLeftOk = leftH < 0 || h > leftH;
    const isRightOk = rightH < 0 || h > rightH;

    this.time.delayedCall(400, () => {
      if (isLeftOk && isRightOk) {
        // PEAK FOUND
        this.triggerVictory(index);
      } else if (!isLeftOk) {
        // Left neighbor is taller → peak is to the left
        this.right = index - 1;
        EventBus.emit('reaction:slide', { text: '◄ LEFT NEIGHBOR TALLER', color: '#ff8844' });
        this.statusText.setText(`Peak is in range [${this.left}–${this.right}]`);
        this.updateRangeHighlight();
        this.refreshBoundaryArrows();
        this.scanning = false;
      } else {
        // Right neighbor is taller → peak is to the right
        this.left = index + 1;
        EventBus.emit('reaction:slide', { text: 'RIGHT NEIGHBOR TALLER ►', color: '#ff8844' });
        this.statusText.setText(`Peak is in range [${this.left}–${this.right}]`);
        this.updateRangeHighlight();
        this.refreshBoundaryArrows();
        this.scanning = false;
      }

      if (!this.won && this.cells <= 0) {
        this.time.delayedCall(500, () => this.triggerDeath());
      }
    });
  }

  private triggerVictory(index: number): void {
    if (this.won) return;
    this.won = true;

    // Highlight peak tower
    const body = this.towerRects[index].getData('body') as Phaser.GameObjects.Graphics;
    const hLabel = this.towerRects[index].getData('heightLabel') as Phaser.GameObjects.Text;
    body.clear();
    body.fillStyle(0x112200, 1);
    body.fillTriangle(-22, 0, 22, 0, 0, -this.heights[index]);
    body.lineStyle(2, 0xaaff00, 0.9);
    body.strokeTriangle(-22, 0, 22, 0, 0, -this.heights[index]);
    hLabel.setStyle({ color: '#aaff00', fontSize: '11px' });

    const spacing = (this.W - 60) / N;
    const startX = 30 + spacing / 2;
    const floorY = this.H * 0.72;
    const tx = startX + index * spacing;

    EventBus.emit('sound:state', { state: 'VICTORY' });
    EventBus.emit('particle:explosion', { x: tx, y: floorY - this.heights[index], type: 'GOLD_BURST', intensity: 1.5 });
    EventBus.emit('particle:explosion', { x: tx, y: floorY - this.heights[index], type: 'SPARKS', intensity: 1.2 });

    this.tweens.timeScale = 0.18;
    this.time.timeScale = 0.18;

    this.time.delayedCall(2200, () => {
      this.tweens.timeScale = 1;
      this.time.timeScale = 1;

      GameState.complete(4, {
        checks: this.checks,
        optimal: Math.ceil(Math.log2(N)),
        timeLeft: this.cells,
      });

      EventBus.emit('scene:stats', {
        mission: 4,
        checks: this.checks,
        optimal: Math.ceil(Math.log2(N)),
        insight: [
          'Find Peak Element: any local peak is a valid answer',
          'If left neighbor > current → peak is in the left half',
          'If right neighbor > current → peak is in the right half',
          'When both neighbors are smaller, you\'re at a peak',
          `Found in ${this.checks} scans. Optimal: ${Math.ceil(Math.log2(N))}`,
        ],
      });
    });
  }

  private triggerDeath(): void {
    if (this.dead) return;
    this.dead = true;
    EventBus.emit('sound:state', { state: 'DEATH' });
    this.cameras.main.fadeOut(900, 10, 0, 0, () => {
      EventBus.emit('scene:death', { mission: 4 });
    });
  }

  update(): void {
    // Subtle scan beam pulse when idle
    if (!this.scanning && !this.won && !this.dead) {
      const t = (Math.sin(Date.now() / 600) + 1) / 2;
      this.scanBeam.setAlpha(0.3 + t * 0.2);
    }
  }

  shutdown(): void {}
}
