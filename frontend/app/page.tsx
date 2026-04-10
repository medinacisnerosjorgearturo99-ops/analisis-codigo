'use client';
import { useState } from 'react';

import AuthModal from './components/AuthModal';
import AnalysisForm from './components/AnalysisForm';
import ProgressPanel from './components/ProgressPanel';
import ResultsPanel from './components/ResultsPanel';
import HistorialPanel from './components/HistorialPanel';

import { useAuth } from './hooks/useAuth';
import { useAnalysis } from './hooks/useAnalysis';
import { useHistorial } from './hooks/useHistorial';

import { AuthMode } from './types';

export default function Home() {
  const auth = useAuth();
  const analysis = useAnalysis(auth.token);
  const historial = useHistorial(auth.token);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<AuthMode>('login');
  const [showHistorial, setShowHistorial] = useState(false);

  const openModal = (mode: AuthMode) => {
    setModalMode(mode);
    setShowModal(true);
  };

  const handleAuthSubmit = async (mode: AuthMode, email: string, password: string) => {
    const ok = await auth.submit(mode, email, password);
    if (ok) setShowModal(false);
  };

  const toggleHistorial = () => {
    if (!showHistorial) historial.fetch();
    setShowHistorial((v) => !v);
  };

  const handleLogout = () => {
    auth.logout();
    historial.clear();
    setShowHistorial(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f1115] text-white p-6 font-sans">

      {/* Header */}
      <div className="w-full max-w-3xl flex justify-end mb-4">
        {auth.isAuthenticated ? (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleHistorial}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-full transition-all"
            >
              {showHistorial ? '✕ Cerrar historial' : '📋 Mi historial'}
            </button>
            <span className="text-xs text-gray-500">{auth.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button
            onClick={() => openModal('login')}
            className="text-xs bg-[#1e293b] hover:bg-[#2d3a5a] text-gray-300 border border-blue-900/50 px-4 py-1.5 rounded-full transition-all"
          >
            Iniciar sesión
          </button>
        )}
      </div>

      <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-gray-200 uppercase text-center">
        Analizador de Código
      </h1>
      <p className="text-gray-500 mb-6 text-sm tracking-wide text-center">
        Sube un .zip, pega código, o ingresa la URL de un repositorio de GitHub.
      </p>

      {!auth.isAuthenticated && (
        <p className="text-gray-600 mb-6 text-xs text-center">
          💡{' '}
          <button
            onClick={() => openModal('registro')}
            className="text-blue-500 hover:text-blue-400 underline"
          >
            Crea una cuenta
          </button>{' '}
          para guardar tu historial de análisis
        </p>
      )}

      {/* Historial */}
      {showHistorial && (
        <div className="w-full max-w-3xl bg-[#161920] border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-300 tracking-widest uppercase mb-4">
            📋 Últimos análisis
          </h2>
          <HistorialPanel entries={historial.entries} loading={historial.loading} />
        </div>
      )}

      {/* Card principal */}
      <div className="w-full max-w-3xl bg-[#161920] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-800 p-8 flex flex-col items-center">
        {analysis.loading && (
          <ProgressPanel
            steps={analysis.steps}
            progress={analysis.progress}
            currentMessage={analysis.currentMessage}
          />
        )}

        {!analysis.loading && analysis.result && (
          <ResultsPanel
            result={analysis.result}
            isAuthenticated={auth.isAuthenticated}
            onReset={analysis.reset}
          />
        )}

        {!analysis.loading && !analysis.result && (
          <AnalysisForm onAnalyze={analysis.run} />
        )}
      </div>

      {/* Modal de auth */}
      {showModal && (
        <AuthModal
          mode={modalMode}
          error={auth.authError}
          loading={auth.authLoading}
          onSubmit={handleAuthSubmit}
          onSwitchMode={(mode) => { setModalMode(mode); auth.clearError(); }}
          onClose={() => { setShowModal(false); auth.clearError(); }}
        />
      )}
    </main>
  );
}
