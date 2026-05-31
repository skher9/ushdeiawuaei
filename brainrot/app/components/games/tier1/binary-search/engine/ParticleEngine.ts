import type { ParticleType } from './EventBus';
import { EventBus } from './EventBus';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: [number, number, number];
  alpha: number;
  type: ParticleType;
}

const MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;
const MAX = MOBILE ? 50 : 200;
const pool: Particle[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let lastTime = 0;

const TYPE_COLORS: Record<ParticleType, [number, number, number][]> = {
  EXPLOSION_DATA:    [[100, 150, 255], [180, 100, 255], [80, 200, 255]],
  EXPLOSION_CORRUPT: [[200, 30, 30],   [80, 0, 0],      [255, 50, 20]],
  SPARKS:            [[255, 255, 200], [255, 220, 80],   [255, 255, 255]],
  OOZE_SPREAD:       [[20, 80, 20],    [0, 60, 0],       [40, 120, 40]],
  CROWD_CONFETTI:    [[255, 100, 100], [100, 255, 100],  [100, 100, 255], [255, 255, 100]] as [number, number, number][],
  GOLD_BURST:        [[255, 210, 0],   [255, 180, 30],   [255, 240, 100]],
  DATA_STREAM:       [[50, 150, 255],  [80, 200, 255],   [30, 100, 200]],
};

function spawnParticle(x: number, y: number, type: ParticleType, intensity: number): Particle {
  const colors = TYPE_COLORS[type];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 3 + 1) * intensity;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  if (type === 'SPARKS') { vy = -Math.abs(vy) * 2; }
  if (type === 'OOZE_SPREAD') { vy = Math.abs(vy) * 0.3; vx *= 1.5; }
  if (type === 'DATA_STREAM') { vx = Math.abs(vx) * 2; vy *= 0.2; }
  if (type === 'CROWD_CONFETTI') { vy = Math.abs(vy); vx *= 0.5; }

  return {
    x, y, vx, vy,
    life: 0,
    maxLife: type === 'OOZE_SPREAD' ? 2.0 : type === 'SPARKS' ? 0.6 : 1.0,
    size: Math.random() * 3 + 2,
    color,
    alpha: 1,
    type,
  };
}

function tick(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!ctx || !canvas) { rafId = requestAnimationFrame(tick); return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.life += dt;
    const t = p.life / p.maxLife;
    p.alpha = 1 - t;
    p.x += p.vx;
    p.y += p.vy;

    if (p.type === 'EXPLOSION_CORRUPT') p.vy += 0.2;
    if (p.type === 'CROWD_CONFETTI') { p.vy += 0.05; p.vx *= 0.99; }
    if (p.type === 'SPARKS') p.vy += 0.15;

    if (p.life >= p.maxLife) { pool.splice(i, 1); continue; }

    const [r, g, b] = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  rafId = requestAnimationFrame(tick);
}

function burst(x: number, y: number, type: ParticleType, intensity: number): void {
  const count = Math.min(Math.round(20 * intensity), MAX - pool.length);
  for (let i = 0; i < count; i++) {
    pool.push(spawnParticle(x, y, type, intensity));
  }
}

const unsubs: (() => void)[] = [];

export async function initParticles(el: HTMLElement): Promise<void> {
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10';
  canvas.width = el.clientWidth;
  canvas.height = el.clientHeight;
  el.appendChild(canvas);
  ctx = canvas.getContext('2d');

  const observer = new ResizeObserver(([entry]) => {
    if (!canvas) return;
    canvas.width = entry.contentRect.width;
    canvas.height = entry.contentRect.height;
  });
  observer.observe(el);

  unsubs.push(
    EventBus.on('particle:explosion', ({ x, y, type, intensity }) => burst(x, y, type, intensity)),
    EventBus.on('particle:continuous', ({ x, y, type, duration }) => {
      let elapsed = 0;
      const iv = setInterval(() => {
        burst(x, y, type, 0.3);
        elapsed += 50;
        if (elapsed >= duration) clearInterval(iv);
      }, 50);
    }),
  );

  lastTime = performance.now();
  rafId = requestAnimationFrame(tick);
}

export function destroyParticles(): void {
  cancelAnimationFrame(rafId);
  unsubs.forEach(u => u());
  unsubs.length = 0;
  pool.length = 0;
  canvas?.remove();
  canvas = null;
  ctx = null;
}
