'use client';
import { HistorialEntry } from '../types';

const SONAR_BASE = process.env.NEXT_PUBLIC_SONAR_URL || 'http://localhost:9000';

interface Props {
  entries: HistorialEntry[];
  loading: boolean;
}

export default function HistorialPanel({ entries, loading }: Props) {
  if (loading) {
    return <p className="text-gray-500 text-sm text-center py-4">Cargando...</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        No tienes análisis guardados aún.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-[#0d0f14] border border-gray-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-white font-semibold text-sm">{entry.proyecto}</p>
            <p className="text-gray-500 text-xs mt-1">{entry.fecha}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-red-400 text-xs">🐛 {entry.bugs}</span>
              <span className="text-orange-400 text-xs">🔓 {entry.vulnerabilidades}</span>
              <span className="text-yellow-400 text-xs">🤢 {entry.code_smells}</span>
            </div>
          </div>
          {entry.sonar_url && (
            <a
              href={entry.sonar_url.replace('http://localhost:9000', SONAR_BASE)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-white border border-gray-700 hover:border-blue-500 px-3 py-1 rounded-full transition-all"
            >
              Ver →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
