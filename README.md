# 🔍 Analizador de Código — DevOps Final

Plataforma web para análisis estático de código usando **SonarQube**, construida con **FastAPI** (backend), **Next.js** (frontend) y orquestada con **Docker Compose**.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  Docker Network                  │
│                                                  │
│  [Next.js :3000] → [FastAPI :8000] → [SonarQube :9000]
│                           ↓                      │
│                    [PostgreSQL :5432]             │
└─────────────────────────────────────────────────┘
```

## 🚀 Cómo levantar el proyecto

### Requisitos
- Docker Desktop instalado
- Git

### Pasos

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd analisis-codigo
```

2. Configura las variables de entorno:
```bash
# Edita backend/.env y pega tu token de SonarQube
SONAR_TOKEN=tu_token_aqui
SONAR_HOST_URL=http://sonarqube:9000
```

3. Levanta todos los servicios:
```bash
docker compose up --build
```

4. Espera a que SonarQube arranque (~2 min) y ve a `http://localhost:9000`
   - Login: `admin` / `admin`
   - Cambia la contraseña y genera un token en **My Account → Security**
   - Pega el token en `backend/.env` y reinicia el backend:
     ```bash
     docker compose restart backend
     ```

5. Abre la app en `http://localhost:3000`

---

## 🧪 Cómo correr los tests

```bash
cd backend
pip install -r requirements.txt pytest httpx
pytest tests/ -v
```

---

## 📋 Modos de análisis

| Modo | Cómo usarlo |
|------|-------------|
| 📦 Archivo ZIP | Arrastra o selecciona un `.zip` con tu proyecto |
| 🔗 Repositorio | Pega una URL de GitHub/GitLab (`https://github.com/...`) |
| 📝 Código | Pega código directamente en el textarea |

---

## ⚙️ Prácticas DevOps implementadas

| Práctica | Herramienta |
|----------|------------|
| Contenedores | Docker + Docker Compose |
| Health checks | `depends_on: condition: service_healthy` |
| CI automático en PRs | GitHub Actions |
| Análisis estático de código | SonarQube |
| Code Review obligatorio | Branch protection en GitHub |
| Variables de entorno seguras | `.env` + GitHub Secrets |

---

## 📁 Estructura del proyecto

```
analisis-codigo/
├── backend/
│   ├── main.py          # API FastAPI con los 3 endpoints de análisis
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env             # Token de SonarQube (NO commitear)
│   └── tests/
│       └── test_main.py
├── frontend/
│   ├── app/
│   │   └── page.tsx     # Interfaz principal
│   └── tailwind.config.ts
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml       # Pipeline de CI
└── README.md
```

---

## 🔒 Seguridad

- El token de SonarQube **nunca** se commitea al repositorio (está en `.env` que está en `.gitignore`)
- En GitHub Actions el token se maneja como **Secret** (`Settings → Secrets → SONAR_TOKEN`)