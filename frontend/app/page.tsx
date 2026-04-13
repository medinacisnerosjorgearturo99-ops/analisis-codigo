'use client';
import { useState } from 'react';

import Navbar from './components/Navbar';
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

  const openModal = (mode: AuthMode) => { setModalMode(mode); setShowModal(true); };

  const handleAuthSubmit = async (mode: AuthMode, email: string, password: string) => {
    const ok = await auth.submit(mode, email, password);
    if (ok) setShowModal(false);
  };

  const toggleHistorial = () => {
    if (!showHistorial) historial.fetch();
    setShowHistorial((v) => !v);
    analysis.reset();
  };

  const handleLogout = () => {
    auth.logout();
    historial.clear();
    setShowHistorial(false);
  };

  const showingResults = !analysis.loading && analysis.result;
  const showingProgress = analysis.loading;
  const showingForm = !analysis.loading && !analysis.result && !showHistorial;

  return (
    <>
      <Navbar
        isAuthenticated={auth.isAuthenticated}
        email={auth.email}
        onLoginClick={() => openModal('login')}
        onLogoutClick={handleLogout}
        onHistorialClick={toggleHistorial}
        showHistorial={showHistorial}
      />

      <main style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '100px',
        paddingBottom: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}>

        {/* Hero — solo cuando está en modo formulario */}
        {showingForm && (
          <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeInUp 0.5s ease forwards' }}>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              color: '#e2e8f0',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
              textShadow: '0 0 40px rgba(59,130,246,0.3)',
            }}>
              Analizador de Código
            </h1>
            <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '16px' }}>
              Sube un .zip, pega código, o ingresa la URL de un repositorio de GitHub.
            </p>
            {!auth.isAuthenticated && (
              <p style={{ fontSize: '13px', color: '#475569' }}>
                💡{' '}
                <button
                  onClick={() => openModal('registro')}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif', textDecoration: 'underline' }}
                >
                  Crea una cuenta
                </button>
                {' '}para guardar tu historial de análisis
              </p>
            )}
          </div>
        )}

        {/* Historial */}
        {showHistorial && (
          <div style={{ width: '100%', maxWidth: '720px', animation: 'fadeInUp 0.4s ease forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0' }}>📋 Mis análisis</h2>
              <button
                onClick={() => setShowHistorial(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                ← Volver a analizar
              </button>
            </div>
            <HistorialPanel entries={historial.entries} loading={historial.loading} />
          </div>
        )}

        {/* Progress */}
        {showingProgress && (
          <ProgressPanel
            steps={analysis.steps}
            progress={analysis.progress}
            currentMessage={analysis.currentMessage}
          />
        )}

        {/* Resultados */}
        {showingResults && (
          <div style={{ width: '100%', maxWidth: '1000px' }}>
            <ResultsPanel
              result={analysis.result!}
              isAuthenticated={auth.isAuthenticated}
              onReset={analysis.reset}
            />
          </div>
        )}

        {/* Formulario */}
        {showingForm && (
          <AnalysisForm onAnalyze={analysis.run} />
        )}
      </main>

      {/* Modal */}
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
    </>
  );
}