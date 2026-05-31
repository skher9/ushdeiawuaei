import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';
import { GameState } from '../engine/GameState';

const N = 20;

export class Mission2Scene extends Phaser.Scene {
  private W = 800;
  private H = 600;

  private firstInfected = 0;
  private left = 1;
  private right = N;
  private checks = 0;
  private health = 3;
  private timeLeft = 45;
  private scanning = false;
  private dead = false;
  private won = false;

  private doors: Phaser.GameObjects.Rectangle[] = [];
  private doorLabels: Phaser.GameObjects.Text[] = [];
  private doorIcons: Phaser.GameObjects.Text[] = [];
  private doorStates: ('unknown' | 'clean' | 'infected')[] = [];

  private healthSegs: Phaser.GameObjects.Rectangle[] = [];
  private timerBarFill!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private pointerLeft!: Phaser.GameObjects.Text;
  private pointerRight!: Phaser.GameObjects.Text;

  private oozeG!: Phaser.GameObjects.Graphics;
  private oozeProgress = 0;
  private timerEvent!: Phaser.Time.TimerEvent;

  private kaiG!: Phaser.GameObjects.Graphics;
  private readonly DOOR_ROWS = [0.37, 0.65];
  private readonly START_X = 55;
  private readonly SPACE_X = 72;
  private readonly DW = 62;
  private readonly DH = 54;

  constructor() { super({ key: 'Mission2Scene' }); }

  create(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.firstInfected = Phaser.Math.Between(5, 16);
    this.left = 1;
    this.right = N;
    this.checks = 0;
    this.health = 3;
    this.timeLeft = 45;
    this.scanning = false;
    this.dead = false;
    this.won = false;
    this.doors = [];
    this.doorLabels = [];
    this.doorIcons = [];
    this.doorStates = Array(N).fill('unknown');
    this.healthSegs = [];
    this.oozeProgress = 0;

    this.buildBackground();
    this.buildChambers();
    this.buildOoze();
    this.buildKai();
    this.buildHUD();

    EventBus.emit('sound:state', { state: 'SCANNING' });
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTimerTick,
      callbackScope: this,
      loop: true,
    });
  }

  private buildBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x05080f, 1);
    bg.fillRect(0, 0, this.W, this.H);

    // Ceiling + floor strips
    bg.fillStyle(0x09101d, 1);
    bg.fillRect(0, 0, this.W, this.H * 0.24);
    bg.fillRect(0, this.H * 0.78, this.W, this.H * 0.22);

    // Perspective floor lines
    for (let i = 0; i < 5; i++) {
      bg.lineStyle(0.5, 0x0d2040, 0.4 - i * 0.06);
      bg.lineBetween(0, this.H * 0.78 + i * 12, this.W, this.H * 0.78 + i * 12);
    }

    // Ceiling lights
    for (let i = 0; i < 6; i++) {
      const lx = (i + 0.5) * (this.W / 6);
      bg.fillStyle(0x001833, 0.5);
      bg.fillRect(lx - 18, this.H * 0.22, 36, 6);
      bg.fillStyle(0x0040aa, 0.08);
      bg.fillRect(lx - 28, this.H * 0.22, 56, 50);
    }

    // Title
    this.add.text(this.W / 2, this.H * 0.12, 'OUTBREAK — FIND FIRST INFECTED', {
      fontFamily: 'monospace', fontSize: '11px', color: '#1e4d28',
    }).setOrigin(0.5).setDepth(10);
  }

  private buildChambers(): void {
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = this.START_X + col * this.SPACE_X + this.DW / 2;
      const y = this.H * this.DOOR_ROWS[row];

      const door = this.add.rectangle(x, y, this.DW, this.DH, 0x0d1117, 1)
        .setStrokeStyle(1, 0x1a3a28, 1)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      this.doors.push(door);

      const label = this.add.text(x, y - 10, `${i + 1}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#1a3a28',
      }).setOrigin(0.5).setDepth(3);
      this.doorLabels.push(label);

      const icon = this.add.text(x, y + 8, '▬', {
        fontFamily: 'monospace', fontSize: '10px', color: '#111',
      }).setOrigin(0.5).setDepth(3);
      this.doorIcons.push(icon);

      door.on('pointerdown', () => this.onDoorClick(i));
      door.on('pointerover', () => {
        if (this.doorStates[i] === 'unknown' && !this.scanning && !this.won && !this.dead) {
          const n = i + 1;
          if (n >= this.left && n <= this.right) door.setFillStyle(0x0d2530);
        }
      });
      door.on('pointerout', () => {
        if (this.doorStates[i] === 'unknown') door.setFillStyle(0x0d1117);
      });
    }

    this.buildPointers();
  }

  private buildPointers(): void {
    this.pointerLeft = this.add.text(0, 0, 'L', {
      fontFamily: 'monospace', fontSize: '9px', color: '#00ffff',
    }).setDepth(10);
    this.pointerRight = this.add.text(0, 0, 'R', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff44ff',
    }).setDepth(10);
    this.refreshPointers();
  }

  private refreshPointers(): void {
    const pos = (n: number) => {
      const i = n - 1;
      const row = Math.floor(i / 10);
      const col = i % 10;
      return {
        x: this.START_X + col * this.SPACE_X + this.DW / 2,
        y: this.H * this.DOOR_ROWS[row] + this.DH / 2 + 6,
      };
    };
    const lp = pos(this.left);
    const rp = pos(this.right);
    this.pointerLeft.setPosition(lp.x - 6, lp.y).setText(`L:${this.left}`);
    this.pointerRight.setPosition(rp.x - 6, rp.y).setText(`R:${this.right}`);
  }

  private buildOoze(): void {
    this.oozeG = this.add.graphics().setDepth(6);
  }

  private drawOoze(): void {
    this.oozeG.clear();
    const edge = this.W * (1 - this.oozeProgress);
    if (edge >= this.W) return;

    // Main ooze body
    this.oozeG.fillStyle(0x102808, 0.75);
    this.oozeG.fillRect(edge, this.H * 0.24, this.W - edge, this.H * 0.54);

    // Pulsing leading edge
    const pulse = (Math.sin(Date.now() / 250) + 1) / 2;
    this.oozeG.lineStyle(2 + pulse * 2, 0x44ff44, 0.5 + pulse * 0.3);
    this.oozeG.lineBetween(edge, this.H * 0.24, edge, this.H * 0.78);

    // Drip particles
    for (let d = 0; d < 4; d++) {
      const dy = (Date.now() / 600 * 30 + d * 45) % (this.H * 0.54);
      this.oozeG.fillStyle(0x66ff44, 0.25);
      this.oozeG.fillCircle(edge + 4 + d * 2, this.H * 0.24 + dy, 2 + Math.sin(d + Date.now() / 400));
    }
  }

  private buildKai(): void {
    this.kaiG = this.add.graphics().setDepth(9);
    this.redrawKai(28, this.H * 0.5);
    this.tweens.add({
      targets: this.kaiG,
      y: '-=3',
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private redrawKai(x: number, y: number): void {
    const g = this.kaiG;
    g.clear();
    const ox = x - 8, oy = y - 22;
    g.fillStyle(0x111827); g.fillRect(ox + 3, oy + 26, 4, 8); g.fillRect(ox + 9, oy + 26, 4, 8);
    g.fillStyle(0x111827); g.fillRect(ox + 2, oy + 12, 12, 14);
    g.fillRect(ox - 2, oy + 12, 4, 10); g.fillRect(ox + 14, oy + 12, 4, 10);
    g.fillStyle(0x3b82f6, 0.8); g.fillRect(ox + 2, oy + 12, 3, 2); g.fillRect(ox + 11, oy + 12, 3, 2);
    g.fillStyle(0x1e293b); g.fillRect(ox + 3, oy + 2, 10, 10);
    g.fillStyle(0x3b82f6); g.fillRect(ox + 4, oy + 5, 8, 4);
    g.fillStyle(0x60a5fa); g.fillRect(ox + 7, oy - 3, 2, 6);
    g.fillCircle(ox + 8, oy - 3, 2);
  }

  private buildHUD(): void {
    // Health
    this.add.text(14, 14, 'HP', { fontFamily: 'monospace', fontSize: '8px', color: '#0a3320' }).setDepth(10);
    for (let i = 0; i < 3; i++) {
      const seg = this.add.rectangle(14 + i * 24, 26, 20, 10, 0x00cc44).setDepth(10).setOrigin(0, 0);
      this.healthSegs.push(seg);
    }

    // Timer bar
    const bx = this.W - 150;
    this.add.text(bx, 14, 'OOZE', { fontFamily: 'monospace', fontSize: '8px', color: '#1a4d1a' }).setDepth(10);
    this.add.rectangle(bx + 65, 26, 120, 8, 0x111111).setDepth(10);
    this.timerBarFill = this.add.rectangle(bx + 5, 26, 120, 8, 0x22cc44).setDepth(11).setOrigin(0, 0.5);

    this.statusText = this.add.text(this.W / 2, this.H - 18, `L:${this.left}  R:${this.right}`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#0d3320',
    }).setOrigin(0.5).setDepth(10);
  }

  private onTimerTick(): void {
    if (this.dead || this.won) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this.oozeProgress = 1 - this.timeLeft / 45;
    this.timerBarFill.setScale(this.timeLeft / 45, 1);

    if (this.timeLeft === 25) EventBus.emit('sound:state', { state: 'TENSION' });
    if (this.timeLeft === 10) EventBus.emit('sound:state', { state: 'CRITICAL' });

    if (this.timeLeft <= 0) this.takeDamage();
  }

  private takeDamage(): void {
    this.health--;
    if (this.health >= 0) {
      this.healthSegs[this.health].setFillStyle(0x1a1a1a);
    }
    this.cameras.main.shake(250, 0.018);
    EventBus.emit('sound:effect', { name: 'damage' });
    EventBus.emit('particle:explosion', { x: 20, y: this.H * 0.5, type: 'EXPLOSION_CORRUPT', intensity: 1.0 });

    if (this.health <= 0) {
      this.triggerDeath();
      return;
    }
    this.timeLeft = 45;
    this.oozeProgress = 0;
  }

  private onDoorClick(index: number): void {
    const chamber = index + 1;
    if (this.scanning || this.won || this.dead) return;
    if (this.doorStates[index] !== 'unknown') return;
    if (chamber < this.left || chamber > this.right) return;

    this.scanning = true;
    this.checks++;

    const isInfected = chamber >= this.firstInfected;

    // Beam from Kai
    const row = Math.floor(index / 10);
    const col = index % 10;
    const dx = this.START_X + col * this.SPACE_X + this.DW / 2;
    const dy = this.H * this.DOOR_ROWS[row];

    const beam = this.add.graphics().setDepth(7);
    beam.lineStyle(1.5, isInfected ? 0xff2200 : 0x00ff88, 0.9);
    beam.lineBetween(28, this.H * 0.5, dx, dy);
    this.tweens.add({ targets: beam, alpha: 0, duration: 350, onComplete: () => beam.destroy() });

    this.time.delayedCall(300, () => {
      if (isInfected) {
        this.doorStates[index] = 'infected';
        this.doors[index].setFillStyle(0x2d0808).setStrokeStyle(1.5, 0xff2200);
        this.doorLabels[index].setStyle({ color: '#ff2200' });
        this.doorIcons[index].setText('✗').setStyle({ color: '#ff2200' });

        this.right = chamber;

        if (this.left === this.right) {
          this.time.delayedCall(400, () => this.triggerVictory(index));
        } else {
          this.sealRange(chamber + 1, N, 'infected');
          this.refreshPointers();
          this.statusText.setText(`L:${this.left}  R:${this.right}  ← searching earlier`);
          EventBus.emit('reaction:slide', { text: '⚠ INFECTED — going left', color: '#ff4400' });
          this.scanning = false;
        }
      } else {
        this.doorStates[index] = 'clean';
        this.doors[index].setFillStyle(0x08250e).setStrokeStyle(1.5, 0x00bb44);
        this.doorLabels[index].setStyle({ color: '#00bb44' });
        this.doorIcons[index].setText('✓').setStyle({ color: '#00bb44' });

        this.left = chamber + 1;
        this.sealRange(1, chamber, 'clean');

        if (this.left > this.right) {
          // Shouldn't happen in valid BS but handle gracefully
          this.scanning = false;
          return;
        }
        if (this.left === this.right) {
          this.time.delayedCall(400, () => this.triggerVictory(this.left - 1));
        } else {
          this.refreshPointers();
          this.statusText.setText(`L:${this.left}  R:${this.right}  → searching right`);
          EventBus.emit('reaction:slide', { text: '✓ CLEAN — going right', color: '#00ff88' });
          this.scanning = false;
        }
      }
    });
  }

  private sealRange(from: number, to: number, state: 'clean' | 'infected'): void {
    for (let n = from; n <= to; n++) {
      const i = n - 1;
      if (this.doorStates[i] !== 'unknown') continue;
      this.doorStates[i] = state;
      if (state === 'clean') {
        this.doors[i].setFillStyle(0x061008).setStrokeStyle(1, 0x0a2010);
        this.doorLabels[i].setStyle({ color: '#0d2a14' });
      } else {
        this.doors[i].setFillStyle(0x100505).setStrokeStyle(1, 0x1e0808);
        this.doorLabels[i].setStyle({ color: '#1e0808' });
      }
      this.doors[i].disableInteractive();
    }
  }

  private triggerVictory(index: number): void {
    if (this.won) return;
    this.won = true;

    // Cure animation
    this.doors[index].setFillStyle(0x102a04).setStrokeStyle(2, 0x88ff00);
    this.doorLabels[index].setStyle({ color: '#aaff00', fontSize: '14px' });
    this.doorIcons[index].setText('✦').setStyle({ color: '#aaff00', fontSize: '14px' });

    EventBus.emit('sound:state', { state: 'VICTORY' });
    EventBus.emit('particle:explosion', {
      x: this.doors[index].x,
      y: this.doors[index].y,
      type: 'GOLD_BURST',
      intensity: 1.5,
    });

    this.tweens.timeScale = 0.2;
    this.time.timeScale = 0.2;

    this.time.delayedCall(1800, () => {
      this.tweens.timeScale = 1;
      this.time.timeScale = 1;

      GameState.complete(2, {
        checks: this.checks,
        optimal: Math.ceil(Math.log2(N + 1)),
        timeLeft: Math.round(this.timeLeft),
      });

      EventBus.emit('scene:stats', {
        mission: 2,
        checks: this.checks,
        optimal: Math.ceil(Math.log2(N + 1)),
        timeLeft: Math.round(this.timeLeft),
        insight: [
          'First Bad Version: binary search on a monotonic boolean function',
          'Infected → search earlier (right = mid)',
          'Clean → search later (left = mid + 1)',
          'When left = right, that chamber IS the first infected',
          `Solved in ${this.checks} checks. Optimal: ${Math.ceil(Math.log2(N + 1))}`,
        ],
      });
    });
  }

  private triggerDeath(): void {
    if (this.dead) return;
    this.dead = true;
    this.timerEvent.remove();
    EventBus.emit('sound:state', { state: 'DEATH' });
    this.cameras.main.fadeOut(900, 10, 20, 0, () => {
      EventBus.emit('scene:death', { mission: 2 });
    });
  }

  update(): void {
    if (!this.won && !this.dead) this.drawOoze();
  }

  shutdown(): void {
    this.timerEvent?.remove();
  }
}
