import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';
import { GameState } from '../engine/GameState';

const FIGHTERS = 12;
// Fighter power levels — sorted ascending
function makeFighters(): number[] {
  const set = new Set<number>();
  while (set.size < FIGHTERS) set.add(Phaser.Math.Between(10, 190));
  return Array.from(set).sort((a, b) => a - b);
}

export class Mission3Scene extends Phaser.Scene {
  private W = 800;
  private H = 600;

  private fighters: number[] = [];
  private challenger = 0;
  private correctGap = 0; // 0 = before all, 12 = after all
  private noiseBars = 0;
  private maxNoise = 5;
  private checks = 0;
  private won = false;
  private dead = false;

  private fighterRects: Phaser.GameObjects.Container[] = [];
  private gapZones: Phaser.GameObjects.Rectangle[] = [];
  private gapArrows: Phaser.GameObjects.Text[] = [];
  private noiseSegs: Phaser.GameObjects.Rectangle[] = [];
  private challengerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private searchLeft = 0;
  private searchRight = FIGHTERS;

  constructor() { super({ key: 'Mission3Scene' }); }

  create(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.fighters = makeFighters();
    // Challenger must not equal any fighter power
    do {
      this.challenger = Phaser.Math.Between(15, 185);
    } while (this.fighters.includes(this.challenger));

    // Find correct gap: first index i where fighters[i] > challenger
    this.correctGap = this.fighters.findIndex(f => f > this.challenger);
    if (this.correctGap === -1) this.correctGap = FIGHTERS;

    this.noiseBars = 0;
    this.checks = 0;
    this.won = false;
    this.dead = false;
    this.searchLeft = 0;
    this.searchRight = FIGHTERS;
    this.fighterRects = [];
    this.gapZones = [];
    this.gapArrows = [];
    this.noiseSegs = [];

    this.buildBackground();
    this.buildFighters();
    this.buildChallenger();
    this.buildNoiseMeter();
    this.buildStatus();

    EventBus.emit('sound:state', { state: 'SCANNING' });
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private buildBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x060509, 1);
    bg.fillRect(0, 0, this.W, this.H);

    // Arena floor hexes (stylized)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        const x = col * 68 + (row % 2) * 34;
        const y = this.H * 0.72 + row * 20;
        bg.lineStyle(0.5, 0x111111, 0.4);
        bg.strokeRect(x, y, 66, 18);
      }
    }

    // Spotlights on arena
    for (let i = 0; i < 3; i++) {
      const sx = (i + 0.5) * (this.W / 3);
      bg.fillStyle(0xffaa00, 0.03);
      bg.fillTriangle(sx, 0, sx - 60, this.H * 0.65, sx + 60, this.H * 0.65);
    }

    // Title
    this.add.text(this.W / 2, this.H * 0.07, 'THE TOURNAMENT — FIND INSERT POSITION', {
      fontFamily: 'monospace', fontSize: '11px', color: '#5533aa',
    }).setOrigin(0.5).setDepth(10);
  }

  private buildFighters(): void {
    const arenaY = this.H * 0.52;
    const FW = 48;
    const FH = 72;
    const spacing = (this.W - 80) / (FIGHTERS + 1);
    const startX = 40 + spacing;

    // Gap zones first (behind fighters)
    for (let g = 0; g <= FIGHTERS; g++) {
      const gx = g === 0
        ? startX - spacing * 0.5
        : g === FIGHTERS
          ? startX + (FIGHTERS - 1) * spacing + spacing * 0.5
          : startX + (g - 0.5) * spacing;

      const zone = this.add.rectangle(gx, arenaY, spacing * 0.6, FH + 10, 0x000000, 0)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });
      this.gapZones.push(zone);

      const arrow = this.add.text(gx, arenaY + FH * 0.6, '↓', {
        fontFamily: 'monospace', fontSize: '14px', color: '#1a0d33',
      }).setOrigin(0.5).setDepth(4);
      this.gapArrows.push(arrow);

      zone.on('pointerover', () => {
        if (!this.won && !this.dead && g >= this.searchLeft && g <= this.searchRight) {
          arrow.setStyle({ color: '#9966ff' });
        }
      });
      zone.on('pointerout', () => {
        if (this.gapZones[g]?.getData('blocked')) return;
        arrow.setStyle({ color: '#1a0d33' });
      });
      zone.on('pointerdown', () => this.onGapClick(g));
    }

    // Fighter containers
    for (let i = 0; i < FIGHTERS; i++) {
      const fx = startX + i * spacing;
      const container = this.add.container(fx, arenaY).setDepth(5);

      // Body
      const body = this.add.graphics();
      const col = i % 4;
      const colors = [0x1a0066, 0x660022, 0x003322, 0x221100];
      const accents = [0x6644ff, 0xff4488, 0x44ffaa, 0xffaa44];
      body.fillStyle(colors[col], 1);
      body.fillRect(-FW / 2, -FH / 2, FW, FH);
      body.lineStyle(1, accents[col], 0.6);
      body.strokeRect(-FW / 2, -FH / 2, FW, FH);
      // Visor
      body.fillStyle(accents[col], 0.4);
      body.fillRect(-FW / 2 + 8, -FH / 2 + 12, FW - 16, 10);

      // Power label
      const pw = this.add.text(0, FH / 2 - 14, `${this.fighters[i]}`, {
        fontFamily: 'monospace', fontSize: '9px', color: `#${accents[col].toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);

      container.add([body, pw]);
      this.fighterRects.push(container);
    }

    // Highlight active search range
    this.highlightRange();
  }

  private buildChallenger(): void {
    // Challenger display at top
    const cx = this.W / 2;
    const cy = this.H * 0.2;

    this.add.text(cx, cy - 20, 'NEW CHALLENGER', {
      fontFamily: 'monospace', fontSize: '10px', color: '#553311',
    }).setOrigin(0.5).setDepth(10);

    const box = this.add.graphics().setDepth(9);
    box.lineStyle(2, 0xffaa00, 0.7);
    box.strokeRect(cx - 35, cy - 14, 70, 28);
    box.fillStyle(0x1a0d00, 1);
    box.fillRect(cx - 34, cy - 13, 68, 26);

    this.challengerText = this.add.text(cx, cy, `⚡ ${this.challenger}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffaa00',
    }).setOrigin(0.5).setDepth(10);

    // Pulsing glow
    this.tweens.add({
      targets: this.challengerText,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildNoiseMeter(): void {
    // Bottom left
    this.add.text(14, this.H - 30, 'CROWD NOISE', {
      fontFamily: 'monospace', fontSize: '8px', color: '#331111',
    }).setDepth(10);
    for (let i = 0; i < this.maxNoise; i++) {
      const seg = this.add.rectangle(14 + i * 22, this.H - 18, 18, 10, 0x220808)
        .setDepth(10).setOrigin(0, 0);
      this.noiseSegs.push(seg);
    }
  }

  private buildStatus(): void {
    this.statusText = this.add.text(this.W / 2, this.H - 18, 'CLICK A GAP TO PLACE CHALLENGER', {
      fontFamily: 'monospace', fontSize: '9px', color: '#2a1155',
    }).setOrigin(0.5).setDepth(10);
  }

  private highlightRange(): void {
    for (let g = 0; g <= FIGHTERS; g++) {
      const inRange = g >= this.searchLeft && g <= this.searchRight;
      this.gapArrows[g].setStyle({ color: inRange ? '#4422aa' : '#0d0820' });
      if (inRange) {
        this.gapZones[g].setInteractive({ useHandCursor: true });
      } else {
        this.gapZones[g].disableInteractive();
      }
    }
  }

  private onGapClick(gap: number): void {
    if (this.won || this.dead) return;
    if (gap < this.searchLeft || gap > this.searchRight) return;

    this.checks++;

    if (gap === this.correctGap) {
      this.triggerVictory(gap);
    } else {
      // Wrong gap — noise +1
      this.noiseBars++;
      this.noiseSegs[this.noiseBars - 1].setFillStyle(0xcc2222);

      // Flash fighters that contradict the guess
      this.flashWrongFighters(gap);

      // Narrow search range
      if (gap < this.correctGap) {
        this.searchLeft = gap + 1;
        EventBus.emit('reaction:slide', { text: '← TOO FAR LEFT', color: '#ff4444' });
      } else {
        this.searchRight = gap - 1;
        EventBus.emit('reaction:slide', { text: '→ TOO FAR RIGHT', color: '#ff4444' });
      }

      this.statusText.setText(`Range: gap ${this.searchLeft}–${this.searchRight}`);
      this.highlightRange();

      EventBus.emit('particle:explosion', { x: this.W / 2, y: this.H * 0.52, type: 'CROWD_CONFETTI', intensity: 0.5 });

      if (this.noiseBars >= this.maxNoise) {
        this.time.delayedCall(600, () => this.triggerDeath());
      }
    }
  }

  private flashWrongFighters(gap: number): void {
    // Fighters whose position contradicts the chosen gap
    const problematic: number[] = [];
    if (gap < this.correctGap) {
      // Challenger must go further right — fighters right of gap are not less than challenger
      for (let i = gap; i < FIGHTERS && this.fighters[i] < this.challenger; i++) {
        problematic.push(i);
      }
    } else {
      // Challenger must go further left — fighters left of gap are not greater than challenger
      for (let i = gap - 1; i >= 0 && this.fighters[i] > this.challenger; i--) {
        problematic.push(i);
      }
    }
    for (const fi of problematic) {
      const c = this.fighterRects[fi];
      this.tweens.add({ targets: c, alpha: 0.2, duration: 150, yoyo: true, repeat: 2 });
    }
  }

  private triggerVictory(gap: number): void {
    if (this.won) return;
    this.won = true;

    // Flash the winning gap
    this.gapArrows[gap].setStyle({ color: '#aaff00', fontSize: '18px' }).setText('★');

    EventBus.emit('sound:state', { state: 'VICTORY' });
    EventBus.emit('particle:explosion', {
      x: this.gapZones[gap].x,
      y: this.H * 0.52,
      type: 'GOLD_BURST',
      intensity: 1.4,
    });

    this.cameras.main.shake(200, 0.008);
    this.tweens.timeScale = 0.2;
    this.time.timeScale = 0.2;

    this.time.delayedCall(1800, () => {
      this.tweens.timeScale = 1;
      this.time.timeScale = 1;

      GameState.complete(3, {
        checks: this.checks,
        optimal: Math.ceil(Math.log2(FIGHTERS + 1)),
        timeLeft: this.maxNoise - this.noiseBars,
      });

      EventBus.emit('scene:stats', {
        mission: 3,
        checks: this.checks,
        optimal: Math.ceil(Math.log2(FIGHTERS + 1)),
        insight: [
          'Search Insert Position: find the leftmost position where target fits',
          'Binary search on gap indices, not fighter indices',
          'If challenger > fighter[mid]: insert position is to the right',
          'If challenger < fighter[mid]: insert position is to the left or at mid',
          `Correct gap: ${this.correctGap}. Solved in ${this.checks} checks.`,
        ],
      });
    });
  }

  private triggerDeath(): void {
    if (this.dead) return;
    this.dead = true;
    EventBus.emit('sound:state', { state: 'DEATH' });
    this.cameras.main.fadeOut(800, 30, 5, 5, () => {
      EventBus.emit('scene:death', { mission: 3 });
    });
  }

  shutdown(): void {}
}
