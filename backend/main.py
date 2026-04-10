from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import shutil
import os
import zipfile
import subprocess
import time
import urllib.request
import json
import base64
import bcrypt
import jwt
from datetime import datetime, timedelta
from database import get_db, engine
from models import Base, Usuario, Historial

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API de Análisis de Código")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN ---
SONAR_TOKEN = os.environ.get("SONAR_TOKEN", "")
SONAR_HOST_URL = os.environ.get("SONAR_HOST_URL", "http://sonarqube:9000")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "clave_secreta_super_segura_2024")

SONAR_EXCLUSIONS = ",".join([
    "**/node_modules/**", "**/.venv/**", "**/venv/**",
    "**/dist/**", "**/build/**", "**/.next/**",
    "**/.git/**", "**/coverage/**", "**/__pycache__/**",
    "**/*.min.js", "**/*.min.css",
])

SONAR_TEST_EXCLUSIONS = ",".join([
    "**/tests/**", "**/test/**", "**/*.test.*",
    "**/*.spec.*", "**/__tests__/**",
])


# ─────────────────────────────────────────────
# AUTH UTILITIES
# ─────────────────────────────────────────────

def crear_token(usuario_id: int, email: str) -> str:
    payload = {
        "sub": usuario_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verificar_token(authorization: str = Header(None)) -> dict | None:
    """Verifica el token JWT. Retorna None si no hay token (usuario anónimo)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")


def guardar_historial(db: Session, usuario_id: int, proyecto: str, stats: dict,
                      ai_recomendaciones: str, sonar_url: str):
    """Guarda un análisis en el historial del usuario."""
    entrada = Historial(
        usuario_id=usuario_id,
        proyecto=proyecto,
        bugs=stats.get("bugs", "0"),
        vulnerabilidades=stats.get("vulnerabilities", "0"),
        code_smells=stats.get("code_smells", "0"),
        ai_recomendaciones=ai_recomendaciones,
        sonar_url=sonar_url,
    )
    db.add(entrada)
    db.commit()


# ─────────────────────────────────────────────
# UTILIDADES SONARQUBE
# ─────────────────────────────────────────────

def wait_for_sonar_task(project_key: str, max_wait: int = 60) -> bool:
    auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
    for _ in range(max_wait // 2):
        time.sleep(2)
        url = f"{SONAR_HOST_URL}/api/ce/activity?component={project_key}&ps=1"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
                tasks = data.get("tasks", [])
                if tasks and tasks[0].get("status") == "SUCCESS":
                    return True
                if tasks and tasks[0].get("status") in ("FAILED", "CANCELLED"):
                    return False
        except Exception as e:
            print(f"⚠️ Error consultando tarea: {e}")
    return False


def get_sonar_metrics(project_key: str) -> dict:
    try:
        auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
        url = (
            f"{SONAR_HOST_URL}/api/measures/component"
            f"?component={project_key}"
            f"&metricKeys=bugs,vulnerabilities,code_smells"
        )
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            measures = data.get("component", {}).get("measures", [])
            return {m["metric"]: m["value"] for m in measures}
    except Exception as e:
        print(f"⚠️ Error obteniendo métricas: {e}")
        return {}


def get_sonar_issues(project_key: str) -> list:
    try:
        auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
        url = (
            f"{SONAR_HOST_URL}/api/issues/search"
            f"?componentKeys={project_key}&ps=10&statuses=OPEN"
        )
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            issues = data.get("issues", [])
            return [
                {
                    "tipo": i.get("type", ""),
                    "severidad": i.get("severity", ""),
                    "mensaje": i.get("message", ""),
                    "archivo": i.get("component", "").split(":")[-1],
                    "linea": i.get("line", "?"),
                }
                for i in issues
            ]
    except Exception as e:
        print(f"⚠️ Error obteniendo issues: {e}")
        return []


# ─────────────────────────────────────────────
# INTEGRACIÓN CON CLAUDE
# ─────────────────────────────────────────────

def get_ai_recommendations(stats: dict, issues: list, project_key: str) -> str:
    if not ANTHROPIC_API_KEY:
        return ""

    bugs = stats.get("bugs", "0")
    vulns = stats.get("vulnerabilities", "0")
    smells = stats.get("code_smells", "0")

    issues_text = "\n".join([
        f"- [{i['severidad']}] {i['tipo']} en {i['archivo']} línea {i['linea']}: {i['mensaje']}"
        for i in issues
    ]) if issues else "No se encontraron issues detallados."

    # ✨ AQUÍ ESTÁ LA MAGIA: El nuevo prompt estructurado ✨
    prompt = f"""Eres un experto en calidad de software y DevOps. Analiza los siguientes resultados de SonarQube para el proyecto '{project_key}'.

MÉTRICAS:
- Bugs: {bugs}
- Vulnerabilidades: {vulns}
- Code Smells: {smells}

ISSUES ENCONTRADOS:
{issues_text}

Por favor responde estrictamente con la siguiente estructura:
1. Un resumen breve del estado general del código desde la perspectiva DevOps (1-2 oraciones).
2. Evaluación del 1 al 10 en las siguientes áreas (justificando brevemente tu puntuación basándote en las métricas):
   - Seguridad: [Nota]/10
   - Escalabilidad: [Nota]/10
   - Facilidad de mantenimiento futuro: [Nota]/10
3. Los 3 problemas más importantes a resolver y sugerencias arquitectónicas o de buenas prácticas para mejorarlos.
4. Una recomendación final de prioridad (qué arreglar primero).

REGLA CRÍTICA: NO incluyas fragmentos de código en tu respuesta bajo ninguna circunstancia. Solo proporciona las sugerencias de mejora de forma descriptiva. Sé conciso y usa lenguaje claro. Máximo 350 palabras."""

    try:
        payload = json.dumps({
            "model": "claude-haiku-4-5",
            "max_tokens": 650, # Subimos los tokens un poco para que no se corte a la mitad
            "messages": [{"role": "user", "content": prompt}]
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            method="POST"
        )

        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            return data["content"][0]["text"]

    except urllib.error.HTTPError as e:
        print(f"⚠️ Error Claude: {e.code} - {e.read().decode()}")
        return ""
    except Exception as e:
        print(f"⚠️ Error general Claude: {e}")
        return ""


# ─────────────────────────────────────────────
# SSE
# ─────────────────────────────────────────────

def sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def run_sonar_scan_stream(source_path: str, project_key: str,
                          usuario_payload: dict | None = None,
                          db: Session | None = None):
    yield sse_event({"paso": 1, "mensaje": "🔍 Iniciando análisis...", "completado": False})

    cmd = [
        "sonar-scanner",
        f"-Dsonar.projectKey={project_key}",
        f"-Dsonar.sources={source_path}",
        f"-Dsonar.host.url={SONAR_HOST_URL}",
        f"-Dsonar.login={SONAR_TOKEN}",
        f"-Dsonar.exclusions={SONAR_EXCLUSIONS}",
        f"-Dsonar.test.exclusions={SONAR_TEST_EXCLUSIONS}",
        "-Dsonar.scm.disabled=true",
        "-Dsonar.coverage.exclusions=**/*",
        "-Dsonar.sourceEncoding=UTF-8",
        "-Dsonar.javascript.node.maxspace=256",
    ]

    yield sse_event({"paso": 2, "mensaje": "⚙️ Ejecutando SonarQube Scanner...", "completado": False})

    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    for line in process.stdout:
        print(line, end="")
    process.wait()

    if process.returncode != 0:
        yield sse_event({"paso": 2, "mensaje": "❌ Error en SonarQube Scanner", "completado": True, "error": True})
        yield sse_event({"finalizado": True, "status": "error", "mensaje": "Fallo en el análisis de SonarQube."})
        return

    yield sse_event({"paso": 2, "mensaje": "✅ Scanner completado", "completado": True})
    yield sse_event({"paso": 3, "mensaje": "⏳ Procesando resultados en SonarQube...", "completado": False})
    wait_for_sonar_task(project_key)
    yield sse_event({"paso": 3, "mensaje": "✅ Resultados procesados", "completado": True})

    yield sse_event({"paso": 4, "mensaje": "📊 Obteniendo métricas...", "completado": False})
    stats = get_sonar_metrics(project_key)
    issues = get_sonar_issues(project_key)
    yield sse_event({"paso": 4, "mensaje": "✅ Métricas obtenidas", "completado": True})

    yield sse_event({"paso": 5, "mensaje": "🤖 Generando recomendaciones con IA...", "completado": False})
    ai_recomendaciones = get_ai_recommendations(stats, issues, project_key)
    yield sse_event({"paso": 5, "mensaje": "✅ Recomendaciones generadas", "completado": True})

    sonar_url = f"http://localhost:9000/dashboard?id={project_key}"

    # Guardar en historial si hay usuario autenticado
    if usuario_payload and db:
        try:
            guardar_historial(
                db, usuario_payload["sub"], project_key,
                stats, ai_recomendaciones, sonar_url
            )
        except Exception as e:
            print(f"⚠️ Error guardando historial: {e}")

    yield sse_event({
        "finalizado": True,
        "status": "success",
        "mensaje": f"Análisis de '{project_key}' completado.",
        "stats": stats,
        "ai_recomendaciones": ai_recomendaciones,
        "sonar_url": sonar_url,
    })


# ─────────────────────────────────────────────
# ENDPOINTS — AUTH
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"mensaje": "API funcionando"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/registro")
def registro(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email y contraseña son requeridos.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

    if db.query(Usuario).filter(Usuario.email == email).first():
        raise HTTPException(status_code=400, detail="Este email ya está registrado.")

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    usuario = Usuario(email=email, password_hash=password_hash)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = crear_token(usuario.id, usuario.email)
    return {"token": token, "email": usuario.email}


@app.post("/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario or not bcrypt.checkpw(password.encode(), usuario.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")

    token = crear_token(usuario.id, usuario.email)
    return {"token": token, "email": usuario.email}


@app.get("/historial")
def obtener_historial(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    usuario_payload = verificar_token(authorization)
    if not usuario_payload:
        raise HTTPException(status_code=401, detail="Debes iniciar sesión para ver el historial.")

    entradas = (
        db.query(Historial)
        .filter(Historial.usuario_id == usuario_payload["sub"])
        .order_by(Historial.fecha.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": e.id,
            "proyecto": e.proyecto,
            "bugs": e.bugs,
            "vulnerabilidades": e.vulnerabilidades,
            "code_smells": e.code_smells,
            "sonar_url": e.sonar_url,
            "fecha": e.fecha.strftime("%d/%m/%Y %H:%M"),
        }
        for e in entradas
    ]


# ─────────────────────────────────────────────
# ENDPOINTS — ANÁLISIS
# ─────────────────────────────────────────────

@app.post("/upload")
async def upload_code(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    usuario_payload = verificar_token(authorization)
    os.makedirs("temp_uploads", exist_ok=True)
    os.makedirs("temp_unzipped", exist_ok=True)

    project_key = os.path.splitext(file.filename)[0]
    file_location = f"temp_uploads/{file.filename}"
    extract_path = f"temp_unzipped/{project_key}"

    try:
        with open(file_location, "wb+") as f:
            shutil.copyfileobj(file.file, f)
        with zipfile.ZipFile(file_location, "r") as zip_ref:
            zip_ref.extractall(extract_path)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo no es un ZIP válido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

    def stream():
        yield sse_event({"paso": 1, "mensaje": "✅ Archivo descomprimido", "completado": True})
        yield from run_sonar_scan_stream(extract_path, project_key, usuario_payload, db)
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/analyze-repo")
async def analyze_repo(
    payload: dict,
    db: Session = Depends(get_db)
):
    # 1. Ya no verificamos el token ni leemos el 'authorization'
    # usuario_payload = verificar_token(authorization)
    
    # 2. Creamos un usuario de prueba rápido con la estructura que espera tu BD
    # Nota: Usamos "sub" porque así lo definiste en tu función crear_token()
    usuario_payload = {"sub": 1, "email": "equipo@prueba.com"}

    repo_url = payload.get("url", "").strip()
    if not repo_url:
        raise HTTPException(status_code=400, detail="No se recibió URL.")
    if not (repo_url.startswith("http") or repo_url.startswith("git@")):
        raise HTTPException(status_code=400, detail="URL de repositorio no válida.")

    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    project_key = repo_name
    clone_path = f"temp_unzipped/{project_key}"

    def stream():
        yield sse_event({"paso": 1, "mensaje": "🔗 Clonando repositorio...", "completado": False})
        try:
            result = subprocess.run(
                ["git", "clone", "--depth=1", repo_url, clone_path],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode != 0:
                yield sse_event({"finalizado": True, "status": "error", "mensaje": f"No se pudo clonar: {result.stderr}"})
                return
            yield sse_event({"paso": 1, "mensaje": "✅ Repositorio clonado", "completado": True})
            
            # Aquí le pasamos el usuario_payload falso para que guarde en BD sin problemas
            yield from run_sonar_scan_stream(clone_path, project_key, usuario_payload, db)
        except subprocess.TimeoutExpired:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": "El repositorio tardó demasiado."})
        except Exception as e:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": str(e)})
        finally:
            if os.path.exists(clone_path):
                shutil.rmtree(clone_path, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/analyze-text")
async def analyze_text(
    payload: dict,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    usuario_payload = verificar_token(authorization)
    code = payload.get("code", "").strip()
    language = payload.get("language", "js")
    if not code:
        raise HTTPException(status_code=400, detail="No se recibió código.")

    project_key = "inline_code"
    temp_dir = f"temp_unzipped/{project_key}"
    os.makedirs(temp_dir, exist_ok=True)

    def stream():
        try:
            with open(os.path.join(temp_dir, f"code.{language}"), "w", encoding="utf-8") as f:
                f.write(code)
            yield sse_event({"paso": 1, "mensaje": "✅ Código recibido", "completado": True})
            yield from run_sonar_scan_stream(temp_dir, project_key, usuario_payload, db)
        except Exception as e:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": str(e)})
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")