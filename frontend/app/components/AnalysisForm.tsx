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

  const selectFile = (f: File) => {
    setFile(f);
    setTextContent('');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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

  const detectedLang =
    textContent.trim() && !isRepoUrl(textContent) ? detectLanguage(textContent) : null;

  const modeLabel = file
    ? `📦 ${file.name}`
    : textContent.trim()
    ? isRepoUrl(textContent)
      ? '🔗 Repositorio detectado'
      : `📝 ${detectedLang?.label} detectado`
    : null;

  return (
    <>
      {modeLabel && (
        <div className="w-full mb-3 text-center text-xs text-blue-400 font-semibold tracking-wider">
          {modeLabel}
        </div>
      )}

      <div
        className={`w-full bg-[#0d0f14] rounded-lg p-2 min-h-[250px] flex flex-col items-center justify-center border-dashed border-2 transition-all relative ${
          isDragging
            ? 'bg-[#1a1f2b] border-blue-400 scale-[1.02]'
            : 'border-gray-800 hover:border-gray-600'
        }`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".zip"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {file ? (
          <div className="flex flex-col items-center text-center p-6">
            <span className="text-5xl mb-4">📦</span>
            <p className="text-green-400 font-bold text-xl mb-2">{file.name}</p>
            <button
              onClick={() => setFile(null)}
              className="text-gray-500 hover:text-red-400 text-sm underline mt-2"
            >
              Quitar archivo y volver a modo texto
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Pega tu código aquí, o escribe la URL de un repositorio (https://github.com/usuario/repo)..."
              className="w-full h-[220px] bg-transparent border-none text-gray-300 placeholder-gray-600 focus:outline-none resize-none p-4 font-mono text-sm"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded transition-colors"
            >
              📂 Buscar .zip en PC
            </button>
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 bg-[#1a1f2b]/90 flex items-center justify-center rounded-lg">
            <span className="text-2xl font-bold text-blue-400 pointer-events-none">
              ¡Suelta tu archivo aquí! ⏬
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        className="mt-8 px-14 py-4 font-bold rounded shadow-[0_5px_15px_rgba(0,0,0,0.4)] uppercase tracking-[0.2em] text-sm transition-all w-full md:w-auto bg-gradient-to-b from-[#2d3a5a] to-[#1e293b] hover:from-[#3b4b7a] hover:to-[#2d3a5a] text-white border border-blue-900/50 active:scale-95"
      >
        Analizar código
      </button>
    </>
  );
}
