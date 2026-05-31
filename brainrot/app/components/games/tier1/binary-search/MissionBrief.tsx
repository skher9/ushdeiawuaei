'use client';
import { COMPLEXITY_COLOR } from './missionConfigs';

interface Props {
  missionName: string;
  situation: string;
  objective: string;
  constraint: string;
  tools: string[];
  difficulty: string;
  lcRef: string;
  score: number;
}

const DIFF_COLOR: Record<string, string> = {
  Easy: '#34d399', Medium: '#ffd60a', Hard: '#ff5a7a',
};

function scoreColor(s: number) {
  if (s >= 90) return '#34d399';
  if (s >= 70) return 'var(--cyan)';
  if (s >= 50) return 'var(--gold)';
  return '#ff5a7a';
}

function BriefRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-4)' }}>{label}</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color, fontFamily: 'var(--font-tac)' }}>{value}</span>
    </div>
  );
}

export default function MissionBrief({ missionName, situation, objective, constraint, tools, difficulty, lcRef, score }: Props) {
  const diffColor = DIFF_COLOR[difficulty] ?? 'var(--ink-3)';

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(11,14,31,0.85), rgba(6,8,20,0.6))',
      borderBottom: '1px solid rgba(0,229,255,0.12)',
      padding: '14px 24px',
      flexShrink: 0,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', gap: 28 }}>
        {/* left: brief */}
        <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--gold)' }}>◇ MISSION BRIEF</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{missionName}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', gap: 20 }}>
            <BriefRow label="SITUATION" value={situation} color="var(--ink-2)" />
            <BriefRow label="OBJECTIVE" value={objective} color="#34d399" />
            <BriefRow label="⚠ CONSTRAINT" value={constraint} color="var(--ink-2)" />
          </div>
        </div>

        {/* right: tools + meta */}
        <div style={{ flex: 4, paddingLeft: 22, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)' }}>AVAILABLE TOOLS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tools.map(t => (
              <span key={t} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                padding: '3px 10px', borderRadius: 6,
                background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
                color: 'var(--cyan)',
              }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: diffColor }}>
                {difficulty.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>LC #{lcRef}</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              color: score === 0 ? 'var(--ink-4)' : scoreColor(score),
            }}>
              {score === 0 ? '--' : `${score}/100`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
