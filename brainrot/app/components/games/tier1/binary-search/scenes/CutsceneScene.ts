import Phaser from 'phaser';
import { EventBus } from '../engine/EventBus';

interface CutsceneData {
  index: number;
  nextScene?: string;
}

export class CutsceneScene extends Phaser.Scene {
  private W = 800;
  private H = 600;
  private sceneData!: CutsceneData;
  private skipped = false;
  private unsub?: () => void;

  constructor() { super({ key: 'CutsceneScene' }); }

  init(data: CutsceneData): void {
    this.sceneData = data ?? { index: 0 };
    this.skipped = false;
  }

  create(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;

    this.buildBackground();
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Emit to React for panel overlay
    this.time.delayedCall(200, () => {
      EventBus.emit('scene:cutscene', { index: this.sceneData.index });
    });

    // Skip on space or tap
    this.input.keyboard?.once('keydown-SPACE', () => this.skip());
    this.input.once('pointerdown', () => this.skip());

    this.unsub = EventBus.on('game:skipCutscene', () => this.skip());

    // Auto-advance after 8s
    this.time.delayedCall(8000, () => {
      if (!this.skipped) this.advance();
    });
  }

  private buildBackground(): void {
    const bg = this.add.graphics();
    // Dark gradient
    for (let i = 0; i < this.H; i += 4) {
      const t = i / this.H;
      const alpha = 0.03 + t * 0.02;
      bg.fillStyle(0x0000ff, alpha);
      bg.fillRect(0, i, this.W, 4);
    }

    // Parallax city silhouette (3 layers)
    const layers = [
      { color: 0x050810, alpha: 1.0, hScale: 0.25, offset: 0 },
      { color: 0x080c18, alpha: 1.0, hScale: 0.18, offset: 60 },
      { color: 0x0d1117, alpha: 1.0, hScale: 0.12, offset: 120 },
    ];

    for (const layer of layers) {
      const g = this.add.graphics();
      g.fillStyle(layer.color, layer.alpha);
      const floorY = this.H * 0.72 + layer.offset * 0.3;
      let x = 0;
      while (x < this.W) {
        const w = 20 + Math.random() * 50;
        const h = this.H * layer.hScale * (0.5 + Math.random() * 0.8);
        g.fillRect(x, floorY - h, w, h + 50);
        x += w + Math.random() * 4;
      }
    }

    // Ground
    const gr = this.add.graphics();
    gr.fillStyle(0x050810, 1);
    gr.fillRect(0, this.H * 0.72, this.W, this.H * 0.28);

    // Ambient data stream
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics();
      g.lineStyle(1, 0x0040ff, 0.3);
      const y = this.H * 0.7 + i * 12;
      g.lineBetween(0, y, this.W, y);
    }

    // Skip hint
    this.add.text(this.W - 12, this.H - 12, 'TAP TO SKIP', {
      fontFamily: 'monospace', fontSize: '9px', color: '#1a1a1a',
    }).setOrigin(1, 1);
  }

  private skip(): void {
    if (this.skipped) return;
    this.skipped = true;
    this.advance();
  }

  private advance(): void {
    EventBus.emit('overlay:clear');
    this.cameras.main.fadeOut(300, 0, 0, 0, () => {
      const next = this.sceneData.nextScene ?? 'WorldMapScene';
      this.scene.start(next);
    });
  }

  shutdown(): void {
    this.unsub?.();
  }
}
