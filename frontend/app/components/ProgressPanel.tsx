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
    <div className="w-full py-4">
      <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-center text-blue-400 text-sm font-semibold mb-6 tracking-wide">
        {currentMessage}
      </p>

      <div className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const state = steps[step.id];
          const completed = state?.completado;
          const active = state?.activo;
          const error = state?.error;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                completed && !error
                  ? 'bg-green-900/20 border border-green-900/40'
                  : error
                  ? 'bg-red-900/20 border border-red-900/40'
                  : active
                  ? 'bg-blue-900/20 border border-blue-900/40'
                  : 'bg-gray-900/20 border border-gray-800'
              }`}
            >
              <span className="text-xl">
                {completed && !error ? '✅' : error ? '❌' : active ? '⏳' : '⬜'}
              </span>
              <span
                className={`text-sm font-medium ${
                  completed && !error
                    ? 'text-green-400'
                    : error
                    ? 'text-red-400'
                    : active
                    ? 'text-blue-400'
                    : 'text-gray-600'
                }`}
              >
                {state?.mensaje || step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
