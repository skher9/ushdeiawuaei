'use client';
import { useEffect, useRef } from 'react';
import { EventBus } from './engine/EventBus';
import { FloatingReactions } from './overlays/FloatingReactions';
import { InsightPanel } from './overlays/InsightPanel';
import { StatsScreen } from './overlays/StatsScreen';
import { DeathScreen } from './overlays/DeathScreen';

export function BinarySearchGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: () => void } | null>(null);
  const particlesRef = useRef<{ destroy: () => void } | null>(null);
  const soundRef = useRef<{ destroy: () => void } | null>(null);
  const audioReady = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    let destroyed = false;

    async function boot() {
      const [{ initGame }, { initParticles, destroyParticles }, { initSound }] =
        await Promise.all([
          import('./engine/GameEngine'),
          import('./engine/ParticleEngine'),
          import('./engine/SoundEngine'),
        ]);

      if (destroyed) return;

      const game = await initGame(el);
      gameRef.current = game;

      await initParticles(el);
      particlesRef.current = { destroy: destroyParticles };

      // Wire audio:init to lazy-init sound engine
      const unsub = EventBus.on('audio:init', async () => {
        if (audioReady.current) return;
        audioReady.current = true;
        const handle = await initSound();
        soundRef.current = handle;
        EventBus.emit('sound:state', { state: 'AMBIENT' });
      });

      return () => { unsub(); };
    }

    const cleanupPromise = boot();

    return () => {
      destroyed = true;
      cleanupPromise.then(cleanup => cleanup?.());
      gameRef.current?.destroy();
      particlesRef.current?.destroy();
      soundRef.current?.destroy();
      gameRef.current = null;
      particlesRef.current = null;
      soundRef.current = null;
      audioReady.current = false;
    };
  }, []);

  // Scene transitions are handled in GameEngine (game:continue, game:retry, scene:worldmap)

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#050810', overflow: 'hidden' }}
    >
      {/* Phaser canvas + particle canvas are appended here by the engines */}
      <FloatingReactions />
      <InsightPanel />
      <StatsScreen />
      <DeathScreen />
    </div>
  );
}
