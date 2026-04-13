'use client';
import { useRef, useEffect, useState } from 'react';
import { detectLanguage, isRepoUrl } from '../utils/language';

interface Props {
  onAnalyze: (endpoint: string, options: RequestInit) => void;
}

export default function AnalysisForm({ onAnalyze }: Props) {
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const selectFile = (f: File) => { setFile(f); setTextContent(''); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) selectFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) selectFile(e.target.files[0]);
  };

  const handleAnalyze = () => {
    if (!file && !textContent.trim()) {
      alert('⚠️ Por favor, pega código, una URL de repositorio, o sube un archivo .zip.');
      return;
    }
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      onAnalyze('/upload', { method: 'POST', body: formData });
      return;
    }
    if (isRepoUrl(textContent)) {
      onAnalyze('/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: textContent.trim() }),
      });
      return;
    }
    const lang = detectLanguage(textContent);
    onAnalyze('/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: textContent, language: lang.ext }),
    });
  };

  const detectedLang = textContent.trim() && !isRepoUrl(textContent) ? detectLanguage(textContent) : null;
  const modeLabel = file
    ? `📦 ${file.name}`
    : textContent.trim()
      ? isRepoUrl(textContent) ? '🔗 Repositorio detectado' : `📝 ${detectedLang?.label} detectado`
      : null;

  return (
    <div style={{ width: '100%', maxWidth: '720px', animation: 'fadeInUp 0.6s ease forwards' }}>
      {modeLabel && (
        <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '12px', color: '#3b82f6', fontWeight: 600, letterSpacing: '0.05em' }}>
          {modeLabel}
        </div>
      )}

      {/* Input area */}
      <div
        className="card"
        style={{
          padding: '4px',
          position: 'relative',
          transition: 'all 0.2s',
          borderColor: isDragging ? 'rgba(59,130,246,0.6)' : undefined,
          boxShadow: isDragging ? '0 0 30px rgba(59,130,246,0.2)' : undefined,
        }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        <input type="file" accept=".zip" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

        {file ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <p style={{ color: '#34d399', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{file.name}</p>
            <button
              onClick={() => setFile(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Quitar archivo
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Pega tu código aquí, o escribe la URL de un repositorio (https://github.com/usuario/repo)..."
              style={{
                width: '100%',
                height: '200px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono, monospace',
                resize: 'none',
                padding: '20px',
                outline: 'none',
                lineHeight: 1.6,
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline"
              style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📂 Buscar .zip en PC
            </button>
          </div>
        )}

        {isDragging && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,20,50,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '12px',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>¡Suelta tu archivo aquí! ⏬</span>
          </div>
        )}
      </div>

      {/* Botón analizar */}
      <button
        onClick={handleAnalyze}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '14px',
          marginTop: '16px',
          letterSpacing: '0.1em',
        }}
      >
        Analizar código
      </button>
    </div>
  );
}