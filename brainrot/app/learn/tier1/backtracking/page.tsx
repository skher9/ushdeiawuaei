'use client';
import BacktrackingHub from '@/components/games/tier1/backtracking/BacktrackingHub';

export default function BacktrackingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <BacktrackingHub />
      </div>
    </div>
  );
}
