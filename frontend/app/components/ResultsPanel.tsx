'use client';
import { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
  isAuthenticated: boolean;
  onReset: () => void;
}

export default function ResultsPanel({ result, isAuthenticated, onReset }: Props) {
  const { status, mensaje, stats, ai_recomendaciones, sonar_url } = result;
  const isSuccess = status === 'success';

  const bugs = parseInt(stats?.bugs ?? '0');
  const vulns = parseInt(stats?.vulnerabilities ?? '0');
  const smells = parseInt(stats?.code_smells ?? '0');
  const totalIssues = bugs + vulns + smells;

  // Parsear puntuaciones de la IA del texto
  const parseScore = (text: string, label: string): string => {
    const match = text.match(new RegExp(`${label}[^\\d]*(\\d+)/10`));
    return match ? match[1] : '–';
  };

  const secScore = ai_recomendaciones ? parseScore(ai_recomendaciones, 'Seguridad') : '–';
  const maintScore = ai_recomendaciones ? parseScore(ai_recomendaciones, 'Mantenibilidad') : '–';
  const scaleScore = ai_recomendaciones ? parseScore(ai_recomendaciones, 'Escalabilidad') : '–';
  const cleanScore = ai_recomendaciones ? parseScore(ai_recomendaciones, 'Limpieza') : '–';

  return (
    <div style={{ width: '100%', animation: 'fadeInUp 0.5s ease forwards' }}>

      {/* Header del resultado */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={onReset}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontFamily: 'Space Grotesk, sans-serif' }}
        >
          ← Volver al analizador
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isSuccess ? 'Análisis completado' : 'Error en el análisis'}
              {isSuccess && <span style={{ color: '#34d399', fontSize: '22px' }}>✓</span>}
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{mensaje}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(56,108,220,0.2)', borderRadius: '6px', padding: '4px 12px' }}>
              📅 {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {isAuthenticated && (
              <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '4px 12px' }}>
                ✅ Guardado
              </span>
            )}
          </div>
        </div>
      </div>

      {isSuccess && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <MetricCard
                icon="🐛"
                label="BUGS"
                value={bugs}
                badge={bugs > 0 ? { text: 'Crítico', type: 'critical' } : { text: '¡Excelente!', type: 'success' }}
              />
              <MetricCard
                icon="🛡️"
                label="VULNERABILIDADES"
                value={vulns}
                badge={vulns > 0 ? { text: 'Revisar', type: 'warning' } : { text: '¡Excelente!', type: 'success' }}
              />
              <MetricCard
                icon="🔧"
                label="CODE SMELLS"
                value={smells}
                badge={smells > 0 ? { text: 'Mejorar', type: 'warning' } : { text: '¡Excelente!', type: 'success' }}
                subtitle="Mejoras de mantenimiento"
              />
            </div>

            {/* Banner de estado */}
            <div className="card" style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderColor: totalIssues === 0 ? 'rgba(16,185,129,0.3)' : totalIssues <= 2 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
              background: totalIssues === 0 ? 'rgba(16,185,129,0.05)' : totalIssues <= 2 ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)',
            }}>
              <span style={{ fontSize: '22px' }}>{totalIssues === 0 ? '✅' : totalIssues <= 2 ? '⚠️' : '🔴'}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', color: totalIssues === 0 ? '#34d399' : totalIssues <= 2 ? '#fbbf24' : '#f87171' }}>
                  {totalIssues === 0 ? '¡Buen trabajo! Tu código está en buen estado.' : `Se encontraron ${totalIssues} problema${totalIssues > 1 ? 's' : ''} en tu código.`}
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {totalIssues === 0 ? 'No se encontraron issues en el análisis.' : `Revisa las recomendaciones de IA para saber cómo resolverlos.`}
                </p>
              </div>
            </div>

            {/* Recomendaciones de IA */}
            {ai_recomendaciones && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    🤖
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Recomendaciones de IA
                    </h3>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>Análisis con SonarQube • Proyecto: '{sonar_url?.split('id=')[1] || 'proyecto'}'</p>
                  </div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {ai_recomendaciones}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Resumen del análisis */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '14px' }}>Resumen del análisis</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SummaryRow icon="📁" label="Issues encontrados" value={`${totalIssues}`} />
                <SummaryRow icon="⏱️" label="Tiempo de análisis" value="~30s" />
                <SummaryRow icon="🔧" label="Herramienta" value="SonarQube" />
                {ai_recomendaciones && (
                  <>
                    <div style={{ borderTop: '1px solid rgba(56,108,220,0.15)', paddingTop: '10px', marginTop: '4px' }}>
                      <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Puntuaciones IA</p>
                    </div>
                    <SummaryRow icon="🔒" label="Seguridad" value={`${secScore}/10`} />
                    <SummaryRow icon="🔧" label="Mantenibilidad" value={`${maintScore}/10`} />
                    <SummaryRow icon="📈" label="Escalabilidad" value={`${scaleScore}/10`} />
                    <SummaryRow icon="✨" label="Limpieza" value={`${cleanScore}/10`} />
                  </>
                )}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' }}>Acciones rápidas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sonar_url && (
                  <a
                    href={sonar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ padding: '10px 16px', fontSize: '12px', textAlign: 'center', textDecoration: 'none', display: 'block' }}
                  >
                    Ver reporte completo ↗
                  </a>
                )}
              </div>
            </div>

            {/* Analizar otro */}
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>¿Quieres analizar otro proyecto?</p>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Inicia un nuevo análisis en segundos.</p>
              <button
                onClick={onReset}
                className="btn-outline"
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
              >
                ← Analizar otro proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {!isSuccess && (
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{mensaje}</p>
          <button onClick={onReset} className="btn-outline" style={{ padding: '10px 24px', fontSize: '13px' }}>
            ← Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, badge, subtitle }: {
  icon: string; label: string; value: number;
  badge: { text: string; type: 'critical' | 'success' | 'warning' };
  subtitle?: string;
}) {
  return (
    <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span className={`badge-${badge.type === 'critical' ? 'critical' : badge.type === 'success' ? 'success' : 'warning'}`}>
          {badge.text}
        </span>
      </div>
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '36px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{value}</p>
      {subtitle && <p style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>{subtitle}</p>}
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icon}</span> {label}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>{value}</span>
    </div>
  );
}