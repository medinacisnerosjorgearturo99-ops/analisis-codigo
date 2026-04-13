'use client';
import { StepState } from '../types';

const STEPS = [
  { id: 1, label: 'Preparando archivos' },
  { id: 2, label: 'Ejecutando SonarQube Scanner' },
  { id: 3, label: 'Procesando resultados' },
  { id: 4, label: 'Obteniendo métricas' },
  { id: 5, label: 'Generando recomendaciones con IA' },
];

interface Props {
  steps: Record<number, StepState>;
  progress: number;
  currentMessage: string;
}

export default function ProgressPanel({ steps, progress, currentMessage }: Props) {
  return (
    <div style={{ width: '100%', maxWidth: '600px', animation: 'fadeInUp 0.4s ease forwards' }}>
      {/* Título */}
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
        Analizando tu código...
      </h2>
      <p style={{ color: '#3b82f6', fontSize: '13px', textAlign: 'center', marginBottom: '28px', fontWeight: 500 }}>
        {currentMessage}
      </p>

      {/* Barra de progreso */}
      <div style={{ background: 'rgba(30,41,59,0.8)', borderRadius: '99px', height: '6px', marginBottom: '28px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
          borderRadius: '99px',
          transition: 'width 0.5s ease',
          boxShadow: '0 0 10px rgba(59,130,246,0.5)',
        }} />
      </div>

      {/* Pasos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {STEPS.map((step) => {
          const state = steps[step.id];
          const completed = state?.completado && !state?.error;
          const error = state?.error;
          const active = state?.activo;

          return (
            <div
              key={step.id}
              className="card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderColor: completed ? 'rgba(16,185,129,0.3)'
                  : error ? 'rgba(239,68,68,0.3)'
                  : active ? 'rgba(59,130,246,0.4)'
                  : undefined,
                background: completed ? 'rgba(16,185,129,0.05)'
                  : error ? 'rgba(239,68,68,0.05)'
                  : active ? 'rgba(59,130,246,0.08)'
                  : undefined,
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>
                {completed ? '✅' : error ? '❌' : active ? '⏳' : '⬜'}
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: completed ? '#34d399' : error ? '#f87171' : active ? '#60a5fa' : '#475569',
              }}>
                {state?.mensaje || step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}