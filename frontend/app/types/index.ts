export interface HistorialEntry {
  id: number;
  proyecto: string;
  bugs: number;
  vulnerabilidades: number;
  code_smells: number;
  sonar_url: string;
  fecha: string;
}

export interface SonarStats {
  bugs?: string;
  vulnerabilities?: string;
  code_smells?: string;
}

export interface AnalysisResult {
  status: 'success' | 'error';
  mensaje: string;
  stats?: SonarStats;
  ai_recomendaciones?: string;
  sonar_url?: string;
}

export interface StepState {
  completado: boolean;
  activo: boolean;
  mensaje: string;
  error: boolean;
}

export type AuthMode = 'login' | 'registro';