'use client';
import { HistorialEntry } from '../types';

const SONAR_BASE = process.env.NEXT_PUBLIC_SONAR_URL || 'http://localhost:9000';

interface Props {
  entries: HistorialEntry[];
  loading: boolean;
}

export default function HistorialPanel({ entries, loading }: Props) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '14px' }}>
        Cargando historial...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>No tienes análisis guardados aún.</p>
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>Analiza un proyecto para ver tu historial aquí.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#e2e8f0', marginBottom: '4px' }}>
              {entry.proyecto}
            </p>
            <p style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>{entry.fecha}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: '#f87171' }}>🐛 {entry.bugs} bugs</span>
              <span style={{ fontSize: '12px', color: '#fb923c' }}>🛡️ {entry.vulnerabilidades} vulns</span>
              <span style={{ fontSize: '12px', color: '#fbbf24' }}>🔧 {entry.code_smells} smells</span>
            </div>
          </div>
          {entry.sonar_url && (
            <a
              href={entry.sonar_url.replace('http://localhost:9000', SONAR_BASE)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none', flexShrink: 0 }}
            >
              Ver →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}