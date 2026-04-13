'use client';

interface NavbarProps {
  isAuthenticated: boolean;
  email: string | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onHistorialClick: () => void;
  showHistorial: boolean;
}

export default function Navbar({
  isAuthenticated,
  email,
  onLoginClick,
  onLogoutClick,
  onHistorialClick,
  showHistorial,
}: NavbarProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(2, 8, 23, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(56, 108, 220, 0.15)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #1d4ed8, #6366f1)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
        }}>
          🔍
        </div>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#e2e8f0', letterSpacing: '0.02em' }}>
          Analizador
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <NavLink label="Analizar" active={!showHistorial} />
        <NavLink
          label="Historial"
          active={showHistorial}
          onClick={isAuthenticated ? onHistorialClick : onLoginClick}
        />
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isAuthenticated ? (
          <>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{email}</span>
            <button
              onClick={onLogoutClick}
              className="btn-outline"
              style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <button
            onClick={onLoginClick}
            className="btn-outline"
            style={{ padding: '6px 20px', fontSize: '13px', fontWeight: 600 }}
          >
            Iniciar sesión
          </button>
        )}
      </div>
    </nav>
  );
}

function NavLink({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: '6px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: active ? 600 : 400,
        color: active ? '#3b82f6' : '#94a3b8',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}