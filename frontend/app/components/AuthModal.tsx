'use client';
import { useState } from 'react';
import { AuthMode } from '../types';

interface Props {
  mode: AuthMode;
  error: string;
  loading: boolean;
  onSubmit: (mode: AuthMode, email: string, password: string) => void;
  onSwitchMode: (mode: AuthMode) => void;
  onClose: () => void;
}

export default function AuthModal({ mode, error, loading, onSubmit, onSwitchMode, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = () => {
    setLocalError('');
    if (mode === 'registro' && password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    onSubmit(mode, email, password);
  };

  const displayError = localError || error;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(2,8,23,0.8)',
    border: '1px solid rgba(56,108,220,0.25)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'Space Grotesk, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(2,8,23,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '16px',
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '420px',
        padding: '32px',
        animation: 'fadeInUp 0.3s ease forwards',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {mode === 'login' ? 'Accede a tu historial de análisis' : 'Guarda tu historial de análisis'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {mode === 'registro' && (
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inputStyle}
            />
          )}

          {displayError && (
            <p style={{ color: '#f87171', fontSize: '12px', textAlign: 'center', padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {displayError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '13px', fontSize: '14px', marginTop: '4px', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'registro' : 'login')}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif', textDecoration: 'underline' }}
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 