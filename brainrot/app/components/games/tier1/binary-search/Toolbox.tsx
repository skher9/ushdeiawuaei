'use client';
import { COMPLEXITY_COLOR, dominantComplexity } from './missionConfigs';
import type { ToolDef } from './missionConfigs';

interface ToolUsed { name: string; complexity: string; }

interface Props {
  tools: ToolDef[];
  activeTool: string;
  usedTools: ToolUsed[];
  onSelectTool: (name: string) => void;
}

const CheckIco = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Toolbox({ tools, activeTool, usedTools, onSelectTool }: Props) {
  const dominant = dominantComplexity(usedTools.map(t => t.complexity));
  const hasUsed = usedTools.length > 0;
  const CYAN = '#00e5ff';

  return (
    <div style={{
      background: 'rgba(6,8,20,0.7)',
      borderBottom: '1px solid rgba(0,229,255,0.10)',
      padding: '8px 24px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      minHeight: 52,
      backdropFilter: 'blur(10px)',
    }}>
      {/* Tool buttons */}
      <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.16em', marginRight: 8 }}>TOOLBOX</span>
        {tools.map(t => {
          const isActive = activeTool === t.name;
          const wasUsed = usedTools.some(u => u.name === t.name);
          const cxColor = COMPLEXITY_COLOR[t.complexity] ?? 'var(--ink-4)';
          return (
            <button
              key={t.name}
              onClick={() => onSelectTool(t.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: isActive ? 'rgba(0,229,255,0.10)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(0,229,255,0.45)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: isActive ? `0 0 16px -4px rgba(0,229,255,0.4)` : 'none',
                transition: 'all 0.12s',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: isActive ? CYAN : 'var(--ink-4)' }}>
                {t.icon}
              </span>
              <span style={{ fontFamily: 'var(--font-tac)', fontSize: 12, fontWeight: 600, color: isActive ? 'var(--ink)' : 'var(--ink-3)' }}>
                {t.name}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${cxColor}44`,
                color: cxColor, letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
                {t.complexity}
              </span>
              {wasUsed && (
                <span style={{ color: '#34d399', display: 'flex' }}><CheckIco /></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Complexity tracker */}
      {hasUsed && (
        <div style={{
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          paddingLeft: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)' }}>DOMINANT</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800,
            color: COMPLEXITY_COLOR[dominant] ?? 'var(--gold)',
            letterSpacing: '0.02em',
          }}>
            {dominant}
          </span>
        </div>
      )}
    </div>
  );
}
