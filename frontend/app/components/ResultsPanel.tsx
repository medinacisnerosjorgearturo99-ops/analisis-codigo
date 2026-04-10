'use client';
import { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
  isAuthenticated: boolean;
  onReset: () => void;
}

export default function ResultsPanel({ result, isAuthenticated, onReset }: Props) {
  const { status, mensaje, stats, ai_recomendaciones, sonar_url } = result;

  return (
    <div className="w-full">
      <div
        className={`p-4 rounded-lg text-center font-bold text-sm mb-6 ${
          status === 'success'
            ? 'bg-green-900/30 text-green-400 border border-green-800'
            : 'bg-red-900/30 text-red-400 border border-red-800'
        }`}
      >
        <p>{mensaje}</p>
        {status === 'success' && isAuthenticated && (
          <p className="text-xs font-normal text-gray-500 mt-1">✅ Guardado en tu historial</p>
        )}
      </div>

      {stats && Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            icon="🐛"
            label="Bugs"
            value={stats.bugs ?? '0'}
            colorClass="border-red-900/50 hover:border-red-500"
            textClass="text-red-400"
          />
          <MetricCard
            icon="🔓"
            label="Vulnerabilidades"
            value={stats.vulnerabilities ?? '0'}
            colorClass="border-orange-900/50 hover:border-orange-500"
            textClass="text-orange-400"
          />
          <MetricCard
            icon="🤢"
            label="Code Smells"
            value={stats.code_smells ?? '0'}
            colorClass="border-yellow-900/50 hover:border-yellow-500"
            textClass="text-yellow-400"
            subtitle="Mejoras de mantenimiento"
          />
        </div>
      )}

      {ai_recomendaciones && (
        <div className="w-full bg-[#0d1117] border border-purple-900/50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-purple-400 font-bold tracking-widest text-xs uppercase">
              Recomendaciones de IA
            </h3>
          </div>
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {ai_recomendaciones}
          </div>
        </div>
      )}

      {sonar_url && (
        <div className="flex justify-center mb-6">
          <a
            href={sonar_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0d0f14] border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-white px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2"
          >
            <span>Ver reporte completo en SonarQube</span>
            <span>→</span>
          </a>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-300 text-sm underline"
        >
          ← Analizar otro proyecto
        </button>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  colorClass: string;
  textClass: string;
  subtitle?: string;
}

function MetricCard({ icon, label, value, colorClass, textClass, subtitle }: MetricCardProps) {
  return (
    <div
      className={`bg-[#1a1f2b] border p-6 rounded-xl flex flex-col items-center shadow-lg transition-colors ${colorClass}`}
    >
      <span className="text-4xl mb-2">{icon}</span>
      <h3 className={`font-bold tracking-widest text-xs uppercase ${textClass}`}>{label}</h3>
      <p className="text-4xl font-extrabold text-white mt-2">{value}</p>
      {subtitle && <p className="text-gray-500 text-[10px] mt-1">{subtitle}</p>}
    </div>
  );
}
