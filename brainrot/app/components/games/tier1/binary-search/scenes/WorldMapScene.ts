import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';
import { GameState } from '../engine/GameState';

const NEON = [0x00ffff, 0xff00ff, 0x0080ff, 0x8000ff, 0x00ff88];

function randNeon(): number { return NEON[Math.floor(Math.random() * NEON.length)]; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export class WorldMapScene extends Phaser.Scene {
  private W = 800;
  private H = 600;
  private buildings: { x: number; y: number; w: number; h: number; color: number }[] = [];
  private dataStreams: Phaser.GameObjects.Graphics[] = [];
  private bsZone!: Phaser.GameObjects.Rectangle;
  private bsLabel!: Phaser.GameObjects.Text;
  private kaiSprite!: Phaser.GameObjects.Graphics;
  private bsPulse = 0;
  private rainParticles: { x: number; y: number; speed: number; len: number }[] = [];
  private unsubs: (() => void)[] = [];

  constructor() { super({ key: 'WorldMapScene' }); }

  create(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;

    // Reset state from any previous run
    this.buildings = [];
    this.dataStreams = [];
    this.rainParticles = [];
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.bsPulse = 0;

    this.buildCity();
    this.buildDistricts();
    this.buildKai();
    this.buildRain();
    this.wireEvents();
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private buildCity(): void {
    const bg = this.add.graphics();
    // Sky gradient (horizontal bands)
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const alpha = lerp(0.08, 0.02, t);
      bg.fillStyle(0x0010ff, alpha);
      bg.fillRect(0, (this.H / 8) * i, this.W, this.H / 8 + 1);
    }

    // Procedural buildings
    const buildG = this.add.graphics();
    const rows = [
      { y: this.H * 0.35, minH: 80, maxH: 200, density: 0.6 },
      { y: this.H * 0.55, minH: 40, maxH: 120, density: 0.8 },
      { y: this.H * 0.7,  minH: 20, maxH: 70,  density: 1.0 },
    ];

    for (const row of rows) {
      let x = 0;
      while (x < this.W) {
        const w = 18 + Math.random() * 40;
        const h = row.minH + Math.random() * (row.maxH - row.minH);
        const gap = Math.random() * 6;
        if (Math.random() < row.density) {
          const color = NEON[Math.floor(Math.random() * NEON.length)];
          this.buildings.push({ x, y: row.y - h, w, h, color });
          buildG.fillStyle(0x050810, 1);
          buildG.fillRect(x, row.y - h, w, h);
          buildG.lineStyle(0.8, color, 0.35 + Math.random() * 0.3);
          buildG.strokeRect(x, row.y - h, w, h);

          // Windows
          for (let wy = row.y - h + 8; wy < row.y - 6; wy += 10) {
            for (let wx = x + 4; wx < x + w - 4; wx += 7) {
              if (Math.random() > 0.5) {
                buildG.fillStyle(color, 0.15 + Math.random() * 0.2);
                buildG.fillRect(wx, wy, 4, 5);
              }
            }
          }
        }
        x += w + gap;
      }
    }

    // Ground / floor
    const floor = this.add.graphics();
    floor.fillStyle(0x050810, 1);
    floor.fillRect(0, this.H * 0.7, this.W, this.H * 0.3);
    floor.lineStyle(1, 0x0040ff, 0.3);
    floor.lineBetween(0, this.H * 0.7, this.W, this.H * 0.7);

    // Data stream rivers
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      this.dataStreams.push(g);
      g.setDepth(2);
    }

    // Flicker animation on buildings
    this.time.addEvent({
      delay: 800,
      callback: () => {
        const b = this.buildings[Math.floor(Math.random() * this.buildings.length)];
        if (!b) return;
        buildG.fillStyle(b.color, 0.08);
        buildG.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      },
      loop: true,
    });
  }

  private buildDistricts(): void {
    const cx = this.W * 0.35;
    const cy = this.H * 0.62;

    // Binary Search district — lit
    this.bsZone = this.add.rectangle(cx, cy, 160, 90, 0x003366, 0.3)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.add.graphics().setDepth(3).lineStyle(1.5, 0x3b82f6, 0.8).strokeRect(cx - 80, cy - 45, 160, 90);

    this.bsLabel = this.add.text(cx, cy - 8, 'BINARY SEARCH', {
      fontFamily: 'monospace', fontSize: '11px', color: '#3b82f6',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(cx, cy + 8, 'TIER I · ZONE 1', {
      fontFamily: 'monospace', fontSize: '8px', color: '#1d4ed8',
    }).setOrigin(0.5).setDepth(4);

    // Locked districts
    const locked = [
      { label: 'TWO POINTERS',   x: this.W * 0.55, y: this.H * 0.6  },
      { label: 'SLIDING WINDOW', x: this.W * 0.7,  y: this.H * 0.65 },
      { label: 'BFS / BFS',      x: this.W * 0.8,  y: this.H * 0.58 },
    ];
    for (const d of locked) {
      this.add.rectangle(d.x, d.y, 130, 70, 0x111111, 0.4).setDepth(3);
      this.add.graphics().setDepth(3).lineStyle(1, 0x222222, 0.5).strokeRect(d.x - 65, d.y - 35, 130, 70);
      this.add.text(d.x, d.y - 6, d.label, { fontFamily: 'monospace', fontSize: '9px', color: '#222' }).setOrigin(0.5).setDepth(4);
      this.add.text(d.x, d.y + 8, '⚿ LOCKED', { fontFamily: 'monospace', fontSize: '8px', color: '#1a1a1a' }).setOrigin(0.5).setDepth(4);
    }

    this.bsZone.on('pointerdown', () => {
      if (!GameState.isAudioReady()) EventBus.emit('audio:init');
      this.cameras.main.zoomTo(1.4, 400, 'Linear', true, (_: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          this.time.delayedCall(200, () => {
            // GameEngine listens for game:startmission and transitions scene
            EventBus.emit('game:startmission', { mission: 1 });
          });
        }
      });
    });

    this.bsZone.on('pointerover', () => {
      this.bsLabel.setStyle({ color: '#60a5fa' });
    });
    this.bsZone.on('pointerout', () => {
      this.bsLabel.setStyle({ color: '#3b82f6' });
    });
  }

  private buildKai(): void {
    const kx = this.W * 0.35;
    const ky = this.H * 0.7 + 10;
    this.kaiSprite = this.add.graphics().setDepth(5);
    this.drawKai(kx, ky);

    // Idle bob
    this.tweens.add({
      targets: this.kaiSprite,
      y: '-=3',
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Soft blue glow
    const glow = this.add.graphics().setDepth(4);
    glow.fillStyle(0x3b82f6, 0.1);
    glow.fillCircle(kx, ky, 24);
    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawKai(x: number, y: number): void {
    const g = this.kaiSprite;
    g.clear();
    const ox = x - 8, oy = y - 22;
    // Legs
    g.fillStyle(0x111827); g.fillRect(ox + 3, oy + 26, 4, 8); g.fillRect(ox + 9, oy + 26, 4, 8);
    // Body
    g.fillStyle(0x111827); g.fillRect(ox + 2, oy + 12, 12, 14);
    // Arms
    g.fillRect(ox - 2, oy + 12, 4, 10); g.fillRect(ox + 14, oy + 12, 4, 10);
    // Shoulder accents
    g.fillStyle(0x3b82f6, 0.8); g.fillRect(ox + 2, oy + 12, 3, 2); g.fillRect(ox + 11, oy + 12, 3, 2);
    // Head
    g.fillStyle(0x1e293b); g.fillRect(ox + 3, oy + 2, 10, 10);
    // Visor
    g.fillStyle(0x3b82f6); g.fillRect(ox + 4, oy + 5, 8, 4);
    // Antenna
    g.fillStyle(0x60a5fa); g.fillRect(ox + 7, oy - 3, 2, 6);
    g.fillCircle(ox + 8, oy - 3, 2);
  }

  private buildRain(): void {
    for (let i = 0; i < 60; i++) {
      this.rainParticles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speed: 3 + Math.random() * 5,
        len: 6 + Math.random() * 12,
      });
    }
  }

  private wireEvents(): void {
    // No local event wiring needed — GameEngine handles scene:worldmap
  }

  update(_t: number, _dt: number): void {
    // Pulse BS district
    this.bsPulse += 0.05;
    const alpha = 0.15 + Math.sin(this.bsPulse) * 0.08;
    this.bsZone.setFillStyle(0x003366, alpha);

    // Update data streams
    this.dataStreams.forEach((g, i) => {
      g.clear();
      const t = (Date.now() / 1000 + i * 0.7) % 1;
      const startX = this.W * (0.1 + i * 0.25);
      const endX = startX + 80;
      const y = this.H * 0.65 + i * 8;
      g.lineStyle(1, 0x003388, 0.6);
      g.lineBetween(startX + t * 80, y, startX + t * 80 + 40, y);
    });

    // Rain
    const rg = this.children.getByName('rain') as Phaser.GameObjects.Graphics | null;
    const rainG = rg ?? (() => {
      const g = this.add.graphics().setDepth(6).setName('rain');
      return g;
    })();
    rainG.clear();
    rainG.lineStyle(0.5, 0x3b82f6, 0.15);
    for (const r of this.rainParticles) {
      r.y += r.speed;
      if (r.y > this.H) { r.y = 0; r.x = Math.random() * this.W; }
      rainG.lineBetween(r.x, r.y, r.x - 1, r.y + r.len);
    }
  }

  shutdown(): void {
    this.unsubs.forEach(u => u());
  }
}
